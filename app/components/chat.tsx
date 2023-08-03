import React, { useEffect, useState } from "react"
import { useChat, type Message } from "ai/react"
import { cn } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ValuesCardCandidate } from "~/lib/consts"
import ValuesDialog from "./values-dialog"
import { DialogTrigger } from "./ui/dialog"
import { Button } from "./ui/button"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  id: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [valueCards, setValueCards] = useState<
    { position: number; card: ValuesCardCandidate }[]
  >([])
  const [isFinished, setIsFinished] = useState(true)

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

  const onManualSubmit = () => {
    append(
      {
        role: "user",
        content: "Submit Card",
      },
      {
        function_call: {
          name: "submit_values_card",
        },
      }
    )
  }

  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
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
      onError: async (error) => {
        console.error(error)
        toast.error(error.message)
        const res = await fetch(`/api/messages/${id}`)
        const json = await res.json()
        if (json && json.messages) {
          const messages = json.messages as Message[]
          const lastMessage = messages[messages.length - 1]
          console.log("messages:", messages)
          console.log("lastMessage:", lastMessage)
          if (lastMessage.role === "user") {
            setInput(lastMessage.content)
          }
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
              isFinished={isFinished}
              isLoading={isLoading}
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
