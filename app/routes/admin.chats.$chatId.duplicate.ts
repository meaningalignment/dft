import { v4 as uuid } from "uuid"
import { LoaderArgs, json, redirect } from "@remix-run/node"
import { auth, db } from "~/config.server"
import { Chat } from "@prisma/client"

export async function loader({ request, params }: LoaderArgs) {
  const user = await auth.getCurrentUser(request)

  if (user?.isAdmin !== true) {
    return json({ message: "Not authorized" }, { status: 401 })
  }

  // Fetch the chat.
  const chatId = params.chatId
  const chat = (await db.chat.findFirst({
    where: { id: chatId },
  })) as Chat | null

  if (!chat) {
    return json({ message: "Chat not found" }, { status: 404 })
  }

  // Duplicate the chat.
  const newChat = await db.chat.create({
    data: {
      ...(chat as any),
      id: uuid(),
      userId: user!.id,
      copiedFromId: chat.id,
      createdAt: new Date(),
    },
  })

  // Redirect to duplicate.
  return redirect(`/case/${newChat.caseId}/chat/${newChat.id}`)
}
