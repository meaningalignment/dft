import { LoaderFunctionArgs, redirect } from "@remix-run/node"
import { db } from "~/config.server"

export async function loader({ params }: LoaderFunctionArgs) {
  const chatId = params.chatId!

  const chat = await db.chat.findFirst({
    where: { id: chatId },
  })

  const defaultCase = (await db.case.findFirst())!.id

  return redirect(`/case/${chat?.caseId ?? defaultCase}/chat/${chatId}`)
}
