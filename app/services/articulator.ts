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
import { embeddingService as embeddings } from "../values-tools/embedding"
import DeduplicationService from "./deduplication"
import { FunctionCallPayload, experimental_StreamData } from "ai"

type ArticulateCardResponse = {
  values_card: ValuesCardData
}

export function normalizeMessage(
  message: ChatCompletionRequestMessage
): ChatCompletionRequestMessage {
  const { role, content, name, function_call } = message

  if (function_call && !function_call.arguments) {
    function_call.arguments = "{}"
  }

  return { role, content, name, function_call }
}

/**
 * A service for handling function calls in the chat.
 */
export class ArticulatorService {
  private deduplication: DeduplicationService
  private openai: OpenAIApi
  private db: PrismaClient
  public config: ArticulatorConfig

  constructor(
    configKey: string,
    deduplication: DeduplicationService,
    openai: OpenAIApi,
    db: PrismaClient
  ) {
    this.config = configs[configKey]
    this.deduplication = deduplication
    this.openai = openai
    this.db = db
  }

  metadata() {
    return metadata(this.config)
  }

  async createChat(
    chatId: string,
    caseId: string,
    userId: number,
    messages: ChatCompletionRequestMessage[]
  ) {
    const systemMessage = {
      role: "system",
      content: this.config.prompts.main.prompt,
    }

    const transcript = [
      systemMessage,
      ...messages.map(normalizeMessage),
    ] as any[]

    return this.db.chat.create({
      data: {
        id: chatId,
        userId,
        caseId,
        transcript,
      },
    })
  }

  async addServerSideMessage(
    chatId: string,
    message: ChatCompletionRequestMessage,
    data?: {
      provisionalCanonicalCardId?: number
      provisionalCard?: ValuesCardData
    }
  ): Promise<any> {
    const chat = await this.db.chat.findUnique({ where: { id: chatId } })

    if (!chat) {
      throw new Error(`Chat ${chatId} not found. Could not append message.`)
    }

    const transcript = [
      ...(chat!.transcript as any),
      normalizeMessage(message),
    ] as any[]

    await this.db.chat.update({
      where: { id: chatId },
      data: { transcript, ...data },
    })

    return transcript
  }

  private async handleArticulateCardFunction(
    chatId: string,
    messages: ChatCompletionRequestMessage[],
    data: experimental_StreamData
  ): Promise<string> {
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
    // Override the card with a canonical duplicate if one exists.
    //
    // Only do this the first time the articulate function is called,
    // since subsequent calls mean the user is revising the card.
    //
    let provisionalCanonicalCardId: number | undefined

    if (!previousCard && !chat.provisionalCanonicalCardId) {
      let canonical = await this.deduplication.fetchSimilarCanonicalCard(
        response.values_card
      )

      if (canonical) {
        console.log(`Found duplicate ${canonical.id} for chat ${chatId}`)

        // Use the canonical duplicate instead.
        provisionalCanonicalCardId = canonical.id
        newCard = toDataModel(canonical)
      }
    }

    await this.addServerSideMessage(
      chatId,
      {
        role: "function",
        name: "articulate_values_card",
        content: JSON.stringify(newCard),
      },
      {
        provisionalCard: newCard!,
        provisionalCanonicalCardId,
      }
    )

    // Append the new values card to the stream.
    data.append({ articulatedCard: newCard })

    return summarize(this.config, "show_values_card", {
      title: newCard!.title,
    })
  }

  private async handleSubmitCardFunction(
    chatId: string,
    data: experimental_StreamData
  ): Promise<string> {
    const chat = (await this.db.chat.findUnique({
      where: { id: chatId },
    })) as Chat

    const card = chat.provisionalCard as ValuesCardData

    // Append the submitted card to the stream.
    data.append({ submittedCard: card })

    return this.submitValuesCard(card, chatId, chat.provisionalCanonicalCardId)
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
    chatId: string,
    clientMessages: ChatCompletionRequestMessage[],
    data: experimental_StreamData
  ) {
    // Add the function message to the transcript.
    let messages = await this.addServerSideMessage(chatId, {
      role: "assistant",
      content: "",
      function_call: {
        name: payload.name,
        arguments: JSON.stringify(payload.arguments),
      },
    })

    //
    // Call the right function.
    //
    let result: string | null = null

    if (payload.name === "show_values_card") {
      result = await this.handleArticulateCardFunction(
        chatId,
        clientMessages,
        data
      )
    } else if (payload.name === "submit_values_card") {
      result = await this.handleSubmitCardFunction(chatId, data)
    } else if (payload.name === "guess_values_card") {
      console.log("Guessed values card", payload.arguments)
    }

    if (result) {
      // Add the function result message to the transcript.
      messages = await this.addServerSideMessage(chatId, {
        role: "function",
        name: payload.name,
        content: result!,
      })
    }

    // Ask for another completion and send it to the client.
    return await this.openai.createChatCompletion({
      model: this.config.model,
      messages,
      temperature: 0.0,
      functions: this.config.prompts.main.functions,
      function_call: "none", // Prevent recursion.
      stream: true,
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
    await embeddings.embedNonCanonicalCard(result)

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
