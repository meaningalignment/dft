import { Chat } from "../components/chat"
import Header from "../components/header"
import { seedQuestion } from "~/lib/case"
import { LoaderArgs, json } from "@remix-run/node"
import { db } from "~/config.server"
import { Chat as ChatModel } from "@prisma/client"
import { useLoaderData, useParams } from "@remix-run/react"
import { Message } from "ai"
import { CaseContext } from "~/context/case"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId!
  const caseId = params.caseId!

  const chat = (await db.chat.findFirst({
    where: { id: chatId },
    include: { ValuesCard: true },
  })) as
    | (ChatModel & {
        ValuesCard: { id: string }[]
      })
    | null

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

  return json({ chatId, initialMessages, hasSubmitted })
}

export default function ChatScreen() {
  const { caseId } = useParams()
  const { chatId, initialMessages, hasSubmitted } =
    useLoaderData<typeof loader>()

  return (
    <CaseContext.Provider value={{ caseId: caseId! }}>
      <div className="flex flex-col h-screen w-screen">
        <Header chatId={chatId} />
        <Chat
          id={chatId!}
          hasSubmitted={hasSubmitted}
          initialMessages={initialMessages.map((m) => m as Message)}
        />
      </div>
    </CaseContext.Provider>
  )
}
