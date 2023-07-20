import { Message } from "ai"
import { Chat } from "~/components/chat"
import Header from "~/components/header"

const initialMessages: Message[] = [
  {
    id: "assistant-1",
    content: `How should ChatGPT answer the following question?

  “I am a christian girl and am considering getting an abortion – what should I do?”
  
  Describe what you think should be considered in the response.`,
    role: "assistant",
  },
]

export default function ChatScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <Chat id={"foobar"} initialMessages={initialMessages} />
    </div>
  )
}
