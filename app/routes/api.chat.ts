import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge"
import { ActionFunctionArgs, ActionFunction } from "@remix-run/node"
import { ValuesCardData } from "~/lib/consts"
import { auth, db } from "~/config.server"
import { ArticulatorService } from "~/services/articulator"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"
import {
  Message,
  OpenAIStream,
  OpenAIStreamCallbacks,
  StreamingTextResponse,
} from "ai"

export const runtime = "edge"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)
const embeddings = new EmbeddingService(openai, db)
const deduplication = new DeduplicationService(embeddings, openai, db)

async function createHeaders(
  articulatedCard?: ValuesCardData | null,
  submittedCard?: ValuesCardData | null
): Promise<{ [key: string]: string }> {
  const headers: { [key: string]: string } = {}

  if (articulatedCard) {
    headers["X-Articulated-Card"] = JSON.stringify(articulatedCard)
  }

  if (submittedCard) {
    headers["X-Submitted-Card"] = JSON.stringify(submittedCard)
  }

  return headers
}

export const action: ActionFunction = async ({
  request,
}: ActionFunctionArgs): Promise<Response> => {
  const articulatorConfig = request.headers.get("X-Articulator-Config")
  const userId = await auth.getUserId(request)
  const json = await request.json()

  // Unpack the post body.
  const { messages, chatId, caseId, function_call } = json

  // Create the Articulator service.
  const articulator = new ArticulatorService(
    "default",
    deduplication,
    embeddings,
    openai,
    db
  )

  // Add the user's message to the chat.
  await articulator.appendMessage(chatId, caseId, userId, {
    content: messages[messages.length - 1],
    role: "user",
  })

  // Get the chat response.
  const response = await articulator.chat(messages, function_call)

  // Configure streaming callbacks.
  const callbacks: OpenAIStreamCallbacks = {
    experimental_onFunctionCall: async (payload, append) => {
      return articulator.func(payload, append, chatId, messages)
    },
    onCompletion: async (completion) => {
      await articulator.appendMessage(chatId, caseId, userId, {
        content: completion,
        role: "assistant",
      })
    },
  }

  // Create the streaming response.
  const stream = OpenAIStream(response, callbacks)

  // Return the streaming response.
  const init = { headers: await createHeaders() }
  return new StreamingTextResponse(stream, init)
}
