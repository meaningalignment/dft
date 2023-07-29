import React, { useState } from "react"
import { useChat, type Message } from "ai/react"
import { cn } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ValuesCard } from "~/lib/consts"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [valueCards, setValueCards] = useState<
    { position: number; card: ValuesCard }[]
  >([])

  const [isFinished, setIsFinished] = useState(false)

  const onCardArticulation = (card: ValuesCard) => {
    console.log("Card articulated:", card)

    setValueCards((prev) => [
      ...prev,
      {
        // The last user & assistant pair has not been appended yet.
        position: messages.length + 1,
        card,
      },
    ])
  }

  const onCardSubmission = (card: ValuesCard) => {
    console.log("Card submitted:", card)

    setIsFinished(true)
  }

  const onReload = () => {
    setIsFinished(false)
    setValueCards([])
    setMessages([...(initialMessages ?? [])])
  }

  const {
    messages,
    append,
    reload,
    stop,
    isLoading,
    input,
    setInput,
    setMessages,
  } = useChat({
    id,
    api: "/api/chat",
    headers: {
      "Content-Type": "application/json",
    },
    initialMessages,
    onResponse: async (response) => {
      const articulatedCard = response.headers.get("X-Articulated-Card")
      if (articulatedCard) {
        onCardArticulation(JSON.parse(articulatedCard) as ValuesCard)
      }

      const submittedCard = response.headers.get("X-Submitted-Card")
      if (submittedCard) {
        onCardSubmission(JSON.parse(submittedCard) as ValuesCard)
      }

      if (response.status === 401) {
        toast.error(response.statusText)
      }
    },
  })

  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} valueCards={valueCards} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <>
            <EmptyScreen />
          </>
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        isFinished={isFinished}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
        onReload={onReload}
      />
    </>
  )
}
