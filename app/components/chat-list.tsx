import { type Message } from "ai"

import { Separator } from "./ui/separator"
import { ChatMessage, LoadingChatMessage } from "./chat-message"
import ChatValuesCard from "./chat-values-card"
import { ValuesCardData } from "~/lib/consts"

export interface ChatList {
  messages: Message[]
  valueCards: { position: number; card: ValuesCardData }[]
  onManualSubmit: (card: ValuesCardData) => void
  isFinished: boolean
  isLoading: boolean
}

export function ChatList({
  messages,
  valueCards,
  onManualSubmit,
  isFinished,
  isLoading,
}: ChatList) {
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
          {valueCard(index) && (
            <ChatValuesCard
              card={valueCard(index)!.card}
              onSubmit={onManualSubmit}
              isFinished={isFinished}
            />
          )}
          <ChatMessage message={message} />
          {index < messages.length - 1 && (
            <Separator className="my-4 md:my-8" />
          )}
        </div>
      ))}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <>
          <Separator className="my-4 md:my-8" />
          <LoadingChatMessage />
        </>
      )}
    </div>
  )
}
