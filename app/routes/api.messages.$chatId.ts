import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node"
import { Message } from "ai"
import { db } from "~/config.server"

export async function loader({ params }: LoaderFunctionArgs) {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  const messages = chat?.transcript ?? []

  return json({ messages })
}

function mergeMessages(oldMessages: Message[], newMessages: Message[]) {
  // go back in new messages, until you find one that's not in old messages, then add the others to the end of old messages
  let i = newMessages.length - 1
  while (i >= 0) {
    const newMessage = newMessages[i]
    const oldMessage = oldMessages.find(
      (message) => message.content === newMessage.content
    )
    if (!oldMessage) break
    i--
  }
  return [...oldMessages, ...newMessages.slice(i)]
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json()
  let { messages, chatId } = body
  messages = messages.filter((message: any) => message.content !== "")

  const chat = await db.chat.findUnique({ where: { id: chatId } })
  if (!chat) throw new Error(`No chat with id ${chatId}`)
  const prevMessages = chat.transcript as any as Message[]
  const mergedMessages = mergeMessages(prevMessages, messages)

  await db.chat.update({
    where: { id: chatId },
    data: { transcript: mergedMessages as any },
  })

  return json({ message: "Saved new messages in db" })
}
