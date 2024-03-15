import { LoaderArgs, redirect } from "@remix-run/node"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId!
  const chat = await db.chat.findFirst({ where: { id: chatId } })
  const caseId = chat?.caseId ?? (await db.case.findFirst({ orderBy: { id: "asc" } }))!.id
  return redirect(`/case/${caseId}/chat/${chatId}`)
}
