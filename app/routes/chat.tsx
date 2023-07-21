import { Message } from "ai"
import { Chat } from "../components/chat"
import Header from "../components/header"
import React from "react"

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
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <Chat id={"chat"} initialMessages={initialMessages} />
    </div>
  )
}
