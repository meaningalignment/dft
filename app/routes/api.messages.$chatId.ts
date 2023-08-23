import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { Message } from "ai"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  const messages = chat?.transcript ?? []

  return json({ messages })
}

function mergeMessages(oldMessages: Message[], newMessages: Message[]) {
  // find the last message in old, and delete everything before that in new, then merge them
  const lastOldMessage = oldMessages[oldMessages.length - 1]
  const lastOldMessageIndex = newMessages.findIndex(
    (message) => message.role === lastOldMessage.role && message.content === lastOldMessage.content
  )
  const newMessagesAfterLastOldMessage = newMessages.slice(lastOldMessageIndex + 1)
  return [...oldMessages, ...newMessagesAfterLastOldMessage]
}

export async function action({ request }: ActionArgs) {
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
