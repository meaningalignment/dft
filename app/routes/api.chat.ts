import { ChatCompletionRequestMessage } from "openai-edge"
import { ActionFunctionArgs, ActionFunction } from "@remix-run/node"
import { auth, db, openai } from "~/config.server"
import { ArticulatorService } from "~/services/articulator"
import DeduplicationService from "~/services/deduplication"
import {
  OpenAIStream,
  OpenAIStreamCallbacks,
  StreamingTextResponse,
  experimental_StreamData,
} from "ai"
import { ReadableStream } from "stream/web"

const deduplication = new DeduplicationService(openai, db)

function isFunctionCall(completion: string) {
  return completion.replace(/[^a-zA-Z0-9_]/g, "").startsWith("function_call")
}

export const action: ActionFunction = async ({
  request,
}: ActionFunctionArgs): Promise<Response> => {
  const articulatorConfig = request.headers.get("X-Articulator-Config")
  const userId = await auth.getUserId(request)
  const json = await request.json()

  // Unpack the post body.
  const { messages: clientMessages, chatId, caseId, function_call } = json

  // Create the Articulator service.
  const articulator = new ArticulatorService(
    articulatorConfig ?? "default",
    deduplication,
    openai,
    db
  )

  //
  // Add the user's message to the chat.
  //
  let messages: ChatCompletionRequestMessage[]

  if ((await db.chat.count({ where: { id: chatId } })) === 0) {
    const chat = await articulator.createChat(
      chatId,
      caseId,
      userId,
      clientMessages
    )
    messages = chat.transcript as any as ChatCompletionRequestMessage[]
  } else {
    messages = await articulator.addServerSideMessage(
      chatId,
      clientMessages[clientMessages.length - 1]
    )
  }

  //
  // Configure streaming callbacks.
  //

  // This data stream object is used to stream data
  // from the functions, like articulated values card and
  // submission states, to the client.
  // const data = new experimental_StreamData()

  // const callbacks: OpenAIStreamCallbacks = {
  //   experimental_onFunctionCall: async (payload) => {
  //     return articulator.func(payload, chatId, messages, data)
  //   },
  //   onCompletion: async (completion) => {
  //     if (isFunctionCall(completion)) {
  //       // Function call completions are handled by the onFunctionCall callback.
  //       return
  //     }

  //     // Save the message to database.
  //     await articulator.addServerSideMessage(chatId, {
  //       content: completion,
  //       role: "assistant",
  //     })
  //   },
  //   experimental_streamData: true,
  //   onFinal() {
  //     data.close()
  //   },
  // }

  // Get the chat response.
  const response = await articulator.chat(messages, function_call)

  // Return a streaming response.
  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
