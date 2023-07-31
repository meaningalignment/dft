import { type Message } from "ai"

import { Separator } from "./ui/separator"
import { ChatMessage } from "./chat-message"
import ValuesCard from "./ui/values-card"
import { ValuesCardCandidate } from "~/lib/consts"

export interface ChatList {
  messages: Message[]
  valueCards: { position: number; card: ValuesCardCandidate }[]
}

export function ChatList({ messages, valueCards }: ChatList) {
  if (!messages.length) {
    return null
  }

  const valueCard = (index: number) => {
    return valueCards.find((card) => card.position === index)
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map((message, index) => (
        <div key={index}>
          {valueCard(index) && <ValuesCard card={valueCard(index)!.card} />}
          <ChatMessage message={message} />
          {index < messages.length - 1 && (
            <Separator className="my-4 md:my-8" />
          )}
        </div>
      ))}
    </div>
  )
}
