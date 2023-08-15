import { PrismaClient, ValuesCard } from "@prisma/client"
import { Session } from "@remix-run/node"
import { ChatCompletionRequestMessage, OpenAIApi } from "openai-edge/types/api"
import {
  ValuesCardData,
  articulateCardFunction,
  articulationPrompt,
  formatCardFunction,
  submitCardFunction,
} from "~/lib/consts"
import { OpenAIStream } from "~/lib/openai-stream"
import { capitalize, toDataModel } from "~/utils"
import EmbeddingService from "./embedding"
import DeduplicationService from "./deduplication"

// import { OpenAIStream, StreamingTextResponse } from "ai"   TODO replace the above import with this once https://github.com/vercel-labs/ai/issues/199 is fixed.

type ArticulateCardFunction = {
  name: string
  arguments: {}
}

type SubmitCardFunction = {
  name: string
  arguments: {}
}

type ArticulateCardResponse = {
  values_card: ValuesCardData
  critique?: string | null
}

/**
 * A service for handling function calls in the chat.
 */
export class FunctionsService {
  private deduplication: DeduplicationService
  private embeddings: EmbeddingService
  private openai: OpenAIApi
  private db: PrismaClient
  private model: string

  constructor(
    deduplication: DeduplicationService,
    embeddings: EmbeddingService,
    openai: OpenAIApi,
    db: PrismaClient,
    model: string = "gpt-4-0613"
  ) {
    this.deduplication = deduplication
    this.embeddings = embeddings
    this.openai = openai
    this.model = model
    this.db = db
  }

  //
  // Vercel AI openai functions handling is broken in Remix. The `experimental_onFunctionCall` provided by the `ai` package does not work.
  //
  // We have to handle them manually, until https://github.com/vercel-labs/ai/issues/199 is fixed.
  // This is done by listening to the first token and seeing if it is a function call.
  // If so, wait for the whole response and handle the function call.
  // Otherwise, return the stream as-is.
  //
  async getFunctionCall(
    res: Response
  ): Promise<ArticulateCardFunction | SubmitCardFunction | null> {
    const stream = OpenAIStream(res.clone()) // .clone() since we don't want to consume the response.
    const reader = stream.getReader()

    //
    // In the case of a function call, the first token in the stream
    // is an unfinished JSON object, with "function_call" as the first key.
    //
    // We can use that key to check if the response is a function call.
    //
    const { value: first } = await reader.read()

    const isFunctionCall = first
      ?.replace(/[^a-zA-Z0-9_]/g, "")
      ?.startsWith("function_call")

    if (!isFunctionCall) {
      return null
    }

    //
    // Function arguments are streamed as tokens, so we need to
    // read the whole stream, concatenate the tokens, and parse the resulting JSON.
    //
    let result = first

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      result += value
    }

    //
    // Return the resulting function call.
    //
    const json = JSON.parse(result)["function_call"]

    // The following is needed due to tokens being streamed with escape characters.
    json["arguments"] = JSON.parse(json["arguments"])

    return json as ArticulateCardFunction | SubmitCardFunction
  }

  async handle(
    func: ArticulateCardFunction | SubmitCardFunction,
    messages: any[] = [],
    session: Session,
    chatId: string
  ): Promise<{
    functionResponse: Response
    articulatedCard: ValuesCardData | null
    submittedCard: ValuesCardData | null
  }> {
    //
    // Call the right function.
    //
    let result: string = ""
    let articulatedCard: ValuesCardData | null = null
    let submittedCard: ValuesCardData | null = null

    switch (func.name) {
      case articulateCardFunction.name: {
        // Get the previously articulated card from the session.
        if (session.has("values_card")) {
          articulatedCard = JSON.parse(
            session.get("values_card")
          ) as ValuesCardData
        }

        // Articulate the values card.
        const res = await this.articulateValuesCard(messages, articulatedCard)

        if (res.critique) {
          result = `<A card was articulated, but it is not yet meeting the guidelines. The following critique was receieved: "${res.critique}". Continue the dialogue with the user until you are able to solve for the critique.>`
        } else {
          articulatedCard = res.values_card

          // Override the card with a canonical duplicate if one exists.
          if (!session.has("values_card") && !res.critique) {
            const canonical = await this.deduplication.fetchCanonicalDuplicate(
              res.values_card
            )

            if (canonical) {
              session.set("canonical_card_id", canonical.id)
              articulatedCard = toDataModel(canonical)
            }
          }

          session.set("values_card", JSON.stringify(articulatedCard))
          result = `<A card (${articulatedCard.title}) was articulated and shown to the user. The preview of the card is shown in the UI, no need to repeat it here. The user can now choose to submit the card.>`
        }

        break
      }
      case submitCardFunction.name: {
        // Get the values card from the session.
        if (!session.has("values_card")) {
          throw Error("No values card in session")
        }

        submittedCard = JSON.parse(session.get("values_card")) as ValuesCardData

        const canonicalCardId = session.get("canonical_card_id") as number

        // Submit the values card.
        result = await this.submitValuesCard(
          submittedCard,
          chatId,
          canonicalCardId
        )

        // Update the session.
        session.unset("values_card")
        session.unset("canonical_card_id")

        break
      }
      default: {
        throw new Error("Unknown function call: " + func.name)
      }
    }

    console.log(`Result from "${func.name}":\n${result}`)

    //
    // Call the OpenAI API with the function result.
    //
    // This wraps the raw function result in a generated message that fits the flow
    // of the conversation.
    //
    const functionResponse = await this.openai.createChatCompletion({
      model: this.model,
      messages: [
        ...messages,
        {
          role: "assistant",
          content: null,
          function_call: {
            name: func.name,
            arguments: JSON.stringify(func.arguments), // API expects a string.
          },
        },
        {
          role: "function",
          name: func.name,
          content: result,
        },
      ],
      temperature: 0.0,
      functions: [articulateCardFunction, submitCardFunction],
      function_call: "none", // Prevent recursion.
      stream: true,
    })

    return { functionResponse, articulatedCard, submittedCard }
  }

  async submitValuesCard(
    card: ValuesCardData,
    chatId: string,
    canonicalCardId?: number
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

    return `<the values card (´${card.title}) was submitted. The user has now submitted 1 value in total. Proceed to thank the user for submitting their value.>`
  }

  /** Create a values card from a transcript of the conversation. */
  async articulateValuesCard(
    messages: ChatCompletionRequestMessage[],
    previousCard: ValuesCardData | null
  ): Promise<ArticulateCardResponse> {
    console.log("Articulating values card...")

    let transcript = messages
      .filter((m) => m.role === "assistant" || m.role === "user")
      .map((m) => `${capitalize(m.role)}: ${m.content}`)
      .join("\n")

    if (previousCard) {
      transcript += `Previous card: ${JSON.stringify(previousCard)}`
    }

    const res = await this.openai.createChatCompletion({
      model: this.model,
      messages: [
        { role: "system", content: articulationPrompt },
        { role: "user", content: transcript },
      ],
      functions: [formatCardFunction],
      function_call: { name: formatCardFunction.name },
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
