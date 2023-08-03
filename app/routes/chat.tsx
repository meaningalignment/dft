import { Message } from "ai"
import { Chat } from "../components/chat"
import Header from "../components/header"
import { v4 as uuid } from "uuid"
import { useRef } from "react"
import { seedQuestion } from "~/lib/consts"

const initialMessages: Message[] = [
  { id: "seed", content: seedQuestion, role: "assistant" },
]

export default function ChatScreen() {
  const chatId = useRef(uuid()).current

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <Chat id={chatId} initialMessages={initialMessages} />
    </div>
  )
}
