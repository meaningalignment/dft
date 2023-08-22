import { Chat } from "../components/chat"
import Header from "../components/header"
import { seedQuestion } from "~/lib/consts"
import { LoaderArgs, json } from "@remix-run/node"
import { db } from "~/config.server"
import { Chat as ChatModel } from "@prisma/client"
import { useLoaderData } from "@remix-run/react"
import { Message } from "ai"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId

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
    : [{ id: "seed", content: seedQuestion, role: "assistant" }]

  return json({ chatId, initialMessages, hasSubmitted })
}

export default function ChatScreen() {
  const { chatId, initialMessages, hasSubmitted } =
    useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header chatId={chatId} />
      <Chat
        id={chatId!}
        hasSubmitted={hasSubmitted}
        initialMessages={initialMessages.map((m) => m as Message)}
      />
    </div>
  )
}
