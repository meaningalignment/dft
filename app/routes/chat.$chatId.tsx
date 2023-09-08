import { LoaderArgs, json, redirect } from "@remix-run/node"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId!

  const chat = await db.chat.findFirst({
    where: { id: chatId },
  })

  if (!chat) {
    return json({ message: "Chat not found" }, { status: 404 })
  }

  return redirect(`/case/${chat.caseId}/chat/${chatId}`)
}
