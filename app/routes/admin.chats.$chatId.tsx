import { LoaderArgs, json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { Message } from "ai"
import { ChatList } from "~/components/chat-list"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  const messages = (chat?.transcript as any as Message[]).slice(1)
  return json({ messages })
}

export default function AdminChat() {
  const { messages } = useLoaderData<typeof loader>()
  return (
    <ChatList
      messages={messages as Message[]}
      isFinished={true}
      isLoading={false}
      valueCards={[]}
      onManualSubmit={() => { }}
    />
  )
}

