import { LoaderFunctionArgs, redirect } from "@remix-run/node"
import { db } from "~/config.server"
import { defaultCase } from "~/lib/case"

export async function loader({ params }: LoaderFunctionArgs) {
  const chatId = params.chatId!

  const chat = await db.chat.findFirst({
    where: { id: chatId },
  })

  return redirect(`/case/${chat?.caseId ?? defaultCase}/chat/${chatId}`)
}
