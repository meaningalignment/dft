import React, { useEffect, useState } from "react"
import { useChat, type Message } from "ai/react"
import { cn } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ValuesCardCandidate } from "~/lib/consts"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  id: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [valueCards, setValueCards] = useState<
    { position: number; card: ValuesCardCandidate }[]
  >([
    // {
    //   position: 0,
    //   card: {
    //     title: "Embodied Truth",
    //     instructions_short:
    //       "ChatGPT should encourage the girl to listen to her body and sense into what feels right.",
    //     instructions_detailed:
    //       "ChatGPT can help the girl connect with her body, listen to her intuition, and sense into what feels right. By doing so, ChatGPT can support her in accessing the truth that is stored in her body.",
    //   },
    // },
  ])
  const [isFinished, setIsFinished] = useState(false)

  const onCardArticulation = (card: ValuesCardCandidate) => {
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

  const onCardSubmission = (card: ValuesCardCandidate) => {
    console.log("Card submitted:", card)

    setIsFinished(true)
  }

  const onManualSubmit = (_: ValuesCardCandidate) => {
    append({
      role: "assistant",
      content: "",
      function_call: {
        name: "submit_values_card",
      },
    })
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
    body: {
      chatId: id,
    },
    initialMessages,
    onResponse: async (response) => {
      const articulatedCard = response.headers.get("X-Articulated-Card")
      if (articulatedCard) {
        onCardArticulation(JSON.parse(articulatedCard) as ValuesCardCandidate)
      }

      const submittedCard = response.headers.get("X-Submitted-Card")
      if (submittedCard) {
        onCardSubmission(JSON.parse(submittedCard) as ValuesCardCandidate)
      }

      if (response.status === 401) {
        toast.error(response.statusText)
      }
    },
    onFinish(message) {
      console.log("Chat finished:", message)
      console.log("messages:", messages)
    },
  })

  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        {messages.length ? (
          <>
            <ChatList
              messages={messages}
              valueCards={valueCards}
              onManualSubmit={onManualSubmit}
            />
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
      />
    </>
  )
}
