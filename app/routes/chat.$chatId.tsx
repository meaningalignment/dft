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
  })) as ChatModel | null

  if (chat?.transcript) {
    const initialMessages = (chat?.transcript as any as Message[]).slice(1)
    return json({ chatId, initialMessages })
  } else {
    const initialMessages = [
      { id: "seed", content: seedQuestion, role: "assistant" },
    ] as Message[]
    return json({ chatId, initialMessages })
  }
}

export default function ChatScreen() {
  const { chatId, initialMessages } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header chatId={chatId} />
      <Chat
        id={chatId!}
        initialMessages={initialMessages.map((m) => m as Message)}
      />
    </div>
  )
}
