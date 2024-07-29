import { type Message } from "ai"
import { Separator } from "./ui/separator"
import { ChatMessage } from "./chat-message"
import ChatMessageLoading from "./chat-message-loading"
import ValuesCard, { ValuesCardData } from "./cards/values-card"

export interface ChatList {
  threadId: string
  messages: Message[]
  isLoading: boolean
}

export function ChatList({
  threadId,
  messages,
  isLoading,
}: ChatList) {
  if (!messages.length) {
    return null
  }

  const getValuesCard = (message: Message): ValuesCardData | null => {
    if (message.role !== "data" || (message.data as any)?.type !== "values_card") {
      return null
    }

    const data = message.data as any
    return {
      title: data.title,
      story: data.story,
      instructionsShort: data.description,
      instructionsDetailed: data.description,
      evaluationCriteria: data.policies,
    }
  }

  const isUserOrAssistantMessage = (message: Message) => {
    return message.role === "assistant" || message.role === "user"
  }

  const isLastMessage = (i: number) => {
    return i === messages.length - 1
  }

  return (
    <div className="relative mx-auto max-w-2xl px-4">
      {messages.map((message, i) => (
        <div key={i}>
          {getValuesCard(message) ? (
            <div className="mb-4">
              <ValuesCard detailsInline card={getValuesCard(message)!} />
            </div>
          ) : isUserOrAssistantMessage(message) && (
            <>
              <ChatMessage message={message} />
              {!isLastMessage(i) && <Separator className="my-4 md:my-8" />}
            </>
          )}
        </div>
      ))}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <>
          <Separator className="my-4 md:my-8" />
          <ChatMessageLoading threadId={threadId} />
        </>
      )}
    </div>
  )
}
