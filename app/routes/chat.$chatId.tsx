import { Chat } from "../components/chat"
import Header from "../components/header"
import { seedQuestion } from "~/lib/consts"
import { LoaderArgs, json } from "@remix-run/node"
import { db } from "~/config.server"
import { Chat as ChatModel } from "@prisma/client"
import { useLoaderData } from "@remix-run/react"
import { Message } from "ai"
import { articulatorConfig as articulatorConfigCookie } from "~/cookies.server"

export async function loader({ request, params }: LoaderArgs) {
  const chatId = params.chatId
  const cookieHeader = request.headers.get("Cookie")
  const articulatorConfig = (await articulatorConfigCookie.parse(cookieHeader)) || 'default'
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

  return json({ chatId, initialMessages, hasSubmitted, articulatorConfig })
}

export default function ChatScreen() {
  const { chatId, initialMessages, hasSubmitted, articulatorConfig } =
    useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header
        chatId={chatId}
        articulatorConfig={articulatorConfig}
      />
      <Chat
        id={chatId!}
        hasSubmitted={hasSubmitted}
        initialMessages={initialMessages.map((m) => m as Message)}
        articulatorConfig={articulatorConfig}
      />
    </div>
  )
}
