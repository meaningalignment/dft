import { Configuration, OpenAIApi } from "openai-edge"
import { ActionArgs, ActionFunction } from "@remix-run/node"
import {
  articulateCardFunction,
  model,
  submitCardFunction,
  systemPrompt,
  ValuesCardData,
} from "~/lib/consts"
import { OpenAIStream, StreamingTextResponse } from "../lib/openai-stream"
import { auth, db } from "~/config.server"
import { FunctionsService } from "~/services/functions"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"

export const runtime = "edge"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)
const embeddings = new EmbeddingService(openai, db)
const deduplication = new DeduplicationService(embeddings, openai, db)
const functions = new FunctionsService(deduplication, embeddings, openai, db)

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
}: ActionArgs): Promise<Response> => {
  const userId = await auth.getUserId(request)
  const json = await request.json()

  let { messages, chatId, function_call } = json

  // Prepend the system message.
  messages = [{ role: "system", content: systemPrompt }, ...messages]

  // Save the transcript in the database in the background.
  const updateDbPromise = db.chat
    .upsert({
      where: { id: chatId },
      update: { transcript: messages },
      create: {
        id: chatId,
        transcript: messages,
        userId,
      },
    })
    .catch((e) => console.error(e))

  // Create stream for next chat message.
  const completionPromise = openai.createChatCompletion({
    model,
    messages: messages,
    temperature: 0.7,
    stream: true,
    functions: [articulateCardFunction, submitCardFunction],
    function_call: function_call ?? "auto",
  })

  // Wait for both the database update and the OpenAI API call to finish.
  const [completionResponse, _] = await Promise.all([
    completionPromise,
    updateDbPromise,
  ])

  if (!completionResponse.ok) {
    const body = await completionResponse.json()
    throw body.error
  }

  // If a function call is present in the stream, handle it...
  const functionCall = await functions.getFunctionCall(completionResponse)

  if (functionCall) {
    const { response, articulatedCard, submittedCard } = await functions.handle(
      functionCall,
      messages,
      chatId
    )

    return new StreamingTextResponse(OpenAIStream(response), {
      headers: await createHeaders(articulatedCard, submittedCard),
    })
  }

  // ...otherwise, return the response.
  return new StreamingTextResponse(OpenAIStream(completionResponse), {
    headers: await createHeaders(),
  })
}
