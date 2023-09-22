import { Chat, PrismaClient, ValuesCard } from "@prisma/client"
import { ChatCompletionRequestMessage, OpenAIApi } from "openai-edge/types/api"
import {
  ArticulatorConfig,
  configs,
  metadata,
  summarize,
} from "./articulator-config"
import { ValuesCardData } from "~/lib/consts"
import { capitalize, isDisplayableMessage, toDataModel } from "~/utils"
import EmbeddingService from "./embedding"
import DeduplicationService from "./deduplication"
import { FunctionCallPayload } from "ai"

// import { OpenAIStream, StreamingTextResponse } from "ai"   TODO replace the above import with this once https://github.com/vercel-labs/ai/issues/199 is fixed.

type ArticulateCardResponse = {
  values_card: ValuesCardData
  critique?: string | null
}

type FunctionResult = {
  message: string | null
  articulatedCard: ValuesCardData | null
  submittedCard: ValuesCardData | null
}

export function normalizeMessage(
  message: ChatCompletionRequestMessage
): ChatCompletionRequestMessage {
  // only role, content, name, function_call
  const { role, content, name, function_call } = message
  if (function_call && !function_call.arguments) function_call.arguments = "{}"
  return { role, content, name, function_call }
}

/**
 * A service for handling function calls in the chat.
 */
export class ArticulatorService {
  private deduplication: DeduplicationService
  private embeddings: EmbeddingService
  private openai: OpenAIApi
  private db: PrismaClient
  public config: ArticulatorConfig

  constructor(
    configKey: string,
    deduplication: DeduplicationService,
    embeddings: EmbeddingService,
    openai: OpenAIApi,
    db: PrismaClient
  ) {
    this.config = configs[configKey]
    this.deduplication = deduplication
    this.embeddings = embeddings
    this.openai = openai
    this.db = db
  }

  metadata() {
    return metadata(this.config)
  }

  // TODO: put it in a transaction
  // private async addServerSideMessage({
  //   chatId,
  //   messages,
  //   message,
  //   data,
  // }: {
  //   chatId: string
  //   messages: ChatCompletionRequestMessage[]
  //   message: ChatCompletionRequestMessage
  //   data?: {
  //     provisionalCard?: ValuesCardData
  //     provisionalCanonicalCardId?: number | null
  //   }
  // }) {
  //   messages.push(message)
  //   const chat = await this.db.chat.findUnique({
  //     where: { id: chatId },
  //   })
  //   const transcript = (chat?.transcript ??
  //     []) as any as ChatCompletionRequestMessage[]
  //   transcript.push(message)
  //   await this.db.chat.update({
  //     where: { id: chatId },
  //     data: {
  //       transcript: transcript as any,
  //       ...data,
  //     },
  //   })
  // }

  async appendMessage(
    chatId: string,
    caseId: string,
    userId: number,
    message: ChatCompletionRequestMessage
  ) {
    let chat = await this.db.chat.findUnique({ where: { id: chatId } })

    if (!chat) {
      await this.db.chat.create({
        data: {
          id: chatId,
          userId: userId,
          caseId: caseId,
          transcript: [],
        },
      })
    } else {
      const transcript = [...(chat!.transcript as any), message] as any

      await this.db.chat.update({
        where: { id: chatId },
        data: { transcript },
      })
    }
  }

  private async handleArticulateCardFunction(
    chatId: string,
    messages: ChatCompletionRequestMessage[]
  ): Promise<FunctionResult> {
    //
    // Fetch the chat with the provisional card from the database.
    //
    const chat = (await this.db.chat.findUnique({
      where: { id: chatId },
    })) as Chat

    const previousCard = chat.provisionalCard
      ? (chat.provisionalCard as ValuesCardData)
      : null

    // Articulate the values card.
    const response = await this.articulateValuesCard(messages, previousCard)

    // The newly articulated card.
    let newCard = response.values_card

    //
    // If the card is not yet meeting the guidelines, generate a follow-up question.
    //
    if (response.critique) {
      const message = summarize(this.config, "show_values_card_critique", {
        critique: response.critique,
      })

      return {
        message,
        articulatedCard: null,
        submittedCard: null,
      }
    }

    //
    // Override the card with a canonical duplicate if one exists.
    //
    // Only do this the first time the articulate function is called,
    // since subsequent calls mean the user is revising the card.
    //
    let provisionalCanonicalCardId: number | null = null

    if (
      !previousCard &&
      !chat.provisionalCanonicalCardId &&
      !response.critique
    ) {
      let canonical = await this.deduplication.fetchSimilarCanonicalCard(
        response.values_card
      )

      if (canonical) {
        provisionalCanonicalCardId = canonical.id
        console.log(`Found duplicate ${canonical.id} for chat ${chatId}`)
        newCard = toDataModel(canonical)
      }
    }

    const message = summarize(this.config, "show_values_card", {
      title: newCard!.title,
    })

    return { message, articulatedCard: newCard, submittedCard: null }
  }

  private async handleSubmitCardFunction(
    chatId: string
  ): Promise<FunctionResult> {
    const chat = (await this.db.chat.findUnique({
      where: { id: chatId },
    })) as Chat

    const card = chat.provisionalCard as ValuesCardData

    // Submit the values card.
    const message = await this.submitValuesCard(
      card,
      chatId,
      chat.provisionalCanonicalCardId
    )

    return { message, submittedCard: card, articulatedCard: null }
  }

  async chat(
    messages: any[] = [],
    function_call: { name: string } | null = null
  ) {
    const completionResponse = await this.openai.createChatCompletion({
      model: this.config.model,
      messages: messages,
      temperature: 0.7,
      stream: true,
      functions: this.config.prompts.main.functions,
      function_call: function_call ?? "auto",
    })

    return completionResponse
  }

  async func(
    payload: FunctionCallPayload,
    append: any,
    chatId: string,
    messages: ChatCompletionRequestMessage[]
  ) {
    let result: FunctionResult | null = {
      message: null,
      articulatedCard: null,
      submittedCard: null,
    }

    if (payload.name === "show_values_card") {
      result = await this.handleArticulateCardFunction(chatId, messages)
    } else if (payload.name === "submit_values_card") {
      result = await this.handleSubmitCardFunction(chatId)
    }

    // Ask for another completion, or return a string to send to the client as an assistant message.
    return await this.openai.createChatCompletion({
      model: this.config.model,
      stream: true,
      messages: [...messages, ...append(result!.message)],
    })
  }

  async submitValuesCard(
    card: ValuesCardData,
    chatId: string,
    canonicalCardId: number | null
  ): Promise<string> {
    console.log(`Submitting values card:\n\n${JSON.stringify(card)}`)

    // Save the card in the database.
    const result = (await this.db.valuesCard
      .create({
        data: {
          title: card.title,
          instructionsShort: card.instructions_short,
          instructionsDetailed: card.instructions_detailed,
          evaluationCriteria: card.evaluation_criteria,
          chatId,
          canonicalCardId: canonicalCardId ?? null,
        },
      })
      .catch((e) => console.error(e))) as ValuesCard

    // Embed card.
    await this.embeddings.embedNonCanonicalCard(result)
    return summarize(this.config, "submit_values_card", { title: card.title })
  }

  /** Create a values card from a transcript of the conversation. */
  async articulateValuesCard(
    messages: ChatCompletionRequestMessage[],
    previousCard: ValuesCardData | null
  ): Promise<ArticulateCardResponse> {
    console.log("Articulating values card...")

    let transcript =
      "Transcript:\n\n" +
      messages
        .filter(
          (m) =>
            isDisplayableMessage(m) ||
            (m.name === "show_values_card" && m.content)
        )
        .map((m) => `${capitalize(m.role)}: ${m.content}`)
        .join("\n")

    if (previousCard) {
      transcript += `\n\nArticulate new, revised card based on: ${JSON.stringify(
        previousCard
      )}`
    }

    const res = await this.openai.createChatCompletion({
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: this.config.prompts.show_values_card.prompt,
        },
        { role: "user", content: transcript },
      ],
      functions: this.config.prompts.show_values_card.functions,
      function_call: { name: "format_card" },
      temperature: 0.0,
      stream: false,
    })

    const data = await res.json()
    const response = JSON.parse(
      data.choices[0].message.function_call.arguments
    ) as ArticulateCardResponse

    return response
  }
}
