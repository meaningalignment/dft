import { Chat } from "../components/chat"
import Header from "../components/header"
import { seedQuestion } from "~/lib/case"
import { LoaderFunctionArgs, json, redirect } from "@remix-run/node"
import { auth, db } from "~/config.server"
import { Chat as ChatModel } from "@prisma/client"
import { useLoaderData, useParams } from "@remix-run/react"
import { Message } from "ai"
import { articulatorConfig as articulatorConfigCookie } from "~/cookies.server"
import { ChatContext } from "~/context/case"

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await auth.getUserId(request)
  const chatId = params.chatId!
  const caseId = params.caseId!
  const cookieHeader = request.headers.get("Cookie")
  const articulatorConfig =
    (await articulatorConfigCookie.parse(cookieHeader)) || "default"
  const chat = (await db.chat.findFirst({
    where: { id: chatId },
    include: { ValuesCard: true },
  })) as
    | (ChatModel & {
        ValuesCard: { id: string }[]
      })
    | null

  if (chat && chat.userId !== userId) {
    throw Error("Unauthorized")
  }

  if (!userId) {
    return redirect("/auth/login")
  }

  const hasSubmitted = Boolean(chat?.ValuesCard)
  const initialMessages = chat?.transcript
    ? (chat?.transcript as any as Message[]).slice(1)
    : [
        {
          id: "seed",
          content: seedQuestion(caseId),
          role: "assistant",
        },
      ]

  return json({ chatId, initialMessages, hasSubmitted, articulatorConfig })
}

export default function ChatScreen() {
  const { caseId } = useParams() as { caseId: string }
  const { chatId, initialMessages, hasSubmitted, articulatorConfig } =
    useLoaderData<typeof loader>()

  return (
    <ChatContext.Provider value={{ chatId, caseId }}>
      <div className="flex flex-col h-screen w-screen">
        <Header articulatorConfig={articulatorConfig} />

        <Chat
          hasSubmitted={hasSubmitted}
          initialMessages={initialMessages.map((m: any) => m as Message)}
          articulatorConfig={articulatorConfig}
        />
      </div>
    </ChatContext.Provider>
  )
}
