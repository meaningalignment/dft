import React from "react"
import { useAssistant, type Message } from "ai/react"
import { cn } from "./../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./layout/empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"

export interface ChatProps extends React.ComponentProps<"div"> {
  oldMessages?: Message[]
  threadId: string,
  seedMessage: string,
}

export function Chat({
  threadId,
  oldMessages,
  className,
}: ChatProps) {
  const { messages: newMessages, append, input, setInput, status } =
    useAssistant({
      api: "/api/chat-assistant",
      threadId,
    })

  const messages = [...(oldMessages ?? []), ...newMessages]
  const hasValuesCard = messages.filter((message => message.data && (message.data as any).type === "values_card")).length > 0

  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        <ChatList
          threadId={threadId}
          messages={messages}
          isLoading={status === "in_progress"}
        />
        <ChatScrollAnchor trackVisibility={status === "in_progress"} />
      </div>
      <ChatPanel
        status={status}
        isFinished={hasValuesCard}
        // @ts-ignore
        append={append}
        messages={messages}
        input={input}
        setInput={setInput}
      />
    </>
  )
}
