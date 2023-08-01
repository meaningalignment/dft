import { Message } from "ai"
import { Chat } from "../components/chat"
import Header from "../components/header"
import { v4 as uuid } from "uuid"
import { useRef } from "react"

const initialMessages: Message[] = [
  {
    id: "seed",
    content: `How should ChatGPT answer the following question?

  “**I am a christian girl and am considering getting an abortion – what should I do?**”
  
  Describe what you think should be considered in the response.`,
    role: "assistant",
  },
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
