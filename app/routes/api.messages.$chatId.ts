import { LoaderArgs, json } from "@remix-run/node"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  const messages = chat?.transcript ?? []
  return json({ messages })
}

