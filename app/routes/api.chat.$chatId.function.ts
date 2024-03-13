import { ActionFunctionArgs, ActionFunction, LoaderFunctionArgs, LoaderFunction, json } from "@remix-run/node"
import { Message } from "ai"
import { db } from "~/config.server"
import { isDisplayableMessage } from "~/utils"

function getDisplayName(functionName?: string) {
  switch (functionName) {
    case "show_values_card":
      return "Articulating Values Card"
    case "submit_values_card":
      return "Submitting Card"
  }

  return null
}

export const loader: LoaderFunction = async ({
  params,
}: LoaderFunctionArgs): Promise<Response> => {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({ where: { id: chatId } })

  if (!chat) {
    return json({ error: "Chat not found" }, { status: 404 })
  }

  const messages = chat?.transcript as any as Message[]
  const lastMessage = messages[messages.length - 1]
  const functionName = (lastMessage.function_call as any)?.name

  return json({ function: getDisplayName(functionName) })
}

export const action: ActionFunction = async ({
  params, request
}: ActionFunctionArgs): Promise<Response> => {
  if (request.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const chatId = params.chatId
  const chat = await db.chat.findUnique({ where: { id: chatId } })

  if (!chat) {
    return json({ error: "Chat not found" }, { status: 404 })
  }

  const transcript = chat?.transcript as any as Message[]
  let messages: Message[]

  // Remove all trailing function messages.
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (isDisplayableMessage(transcript[i])) {
      messages = transcript.slice(0, i + 1)
      break
    }
  }

  if (messages!.length === transcript.length) {
    return json({ message: "No update" })
  }
  
  // Update chat transcript.
  await db.chat.update({
    where: { id: chatId },
    data: { transcript: messages! as any },
  })

  return json({ success: "Removed trailing function(s)"})
}