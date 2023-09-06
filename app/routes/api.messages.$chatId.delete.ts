import { ActionArgs, json } from "@remix-run/node"
import { Message } from "ai"
import { db } from "~/config.server"
import { removeLast } from "~/utils"

export async function action({ request }: ActionArgs) {
  const body = await request.json()
  let { message, chatId } = body

  const chat = await db.chat.findUnique({ where: { id: chatId } })

  if (!chat) {
    throw new Error(`No chat with id ${chatId}`)
  }

  const messages = chat.transcript as any as Message[]

  // Remove the last occurence of a message with the matching content and role.
  // Note that we don't store message IDs in the database, so we cannot be certain
  // This is the correct message If there are several messages with the same role and content,
  // the last one will be removed regardless of which one was actually clicked.
  //
  // Since this feature is only available for admin users, this is acceptable for now.
  const newMessages = removeLast(
    messages,
    (m: Message) => m.content === message.content && m.role === message.role
  )

  await db.chat.update({
    where: { id: chatId },
    data: { transcript: newMessages as any },
  })

  return json({ message: "Removed message in db" })
}
