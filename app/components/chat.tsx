import React, { useContext, useEffect, useRef, useState } from "react"
import { useChat, type Message } from "ai/react"
import { cn, isDisplayableMessage } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ValuesCardData } from "~/lib/consts"
import { useRevalidator } from "@remix-run/react"
import { useCurrentUser } from "~/root"
import { ChatContext } from "~/context/case"
import va from "@vercel/analytics"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  hasSubmitted?: boolean
  articulatorConfig?: string
}

export function Chat({
  initialMessages,
  hasSubmitted,
  className,
  articulatorConfig = "default",
}: ChatProps) {
  const { chatId, caseId } = useContext(ChatContext)!
  const user = useCurrentUser()
  const revalidator = useRevalidator()
  const [valueCards, setValueCards] = useState<
    { position: number; card: ValuesCardData }[]
  >([])
  const [isFinished, setIsFinished] = useState(hasSubmitted === true)

  // Recover the state of a conversation.
  useEffect(() => {
    if (!initialMessages) return
    let newMessages: Message[] = []
    let valuesCards: { position: number; card: ValuesCardData }[] = []

    for (const message of initialMessages) {
      if (
        message.name === "show_values_card" ||
        message.name === "articulate_values_card" // backwards compat.
      ) {
        try {
          const card = JSON.parse(message.content)
          valuesCards.push({
            position: newMessages.length,
            card,
          })
        } catch (e) {
          continue // We use the same function signature for the reply message, that is not json.
        }
      } else if (isDisplayableMessage(message)) {
        newMessages.push(message)
      }
    }

    setMessages(newMessages)
    setValueCards(valuesCards)
  }, [initialMessages])

  const onCardArticulation = (card: ValuesCardData) => {
    va.track("Articulated Card")
    setValueCards((prev) => [...prev, { position: messages.length - 1, card }])
  }

  const onCardSubmission = (card: ValuesCardData) => {
    va.track("Submitted Card")
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
          arguments: "{}",
        },
      }
    )
  }

  const onDeleteMessage = (message: Message) => {
    fetch(`/api/messages/${chatId}/delete`, {
      method: "DELETE",
      headers: {
        "X-Articulator-Config": articulatorConfig,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chatId, message }),
    }).then(() => {
      revalidator.revalidate()
    })
  }

  const {
    data,
    messages,
    append,
    reload,
    stop,
    isLoading,
    input,
    setInput,
    setMessages,
  } = useChat({
    id: chatId,
    api: "/api/chat",
    headers: {
      "X-Articulator-Config": articulatorConfig,
      "Content-Type": "application/json",
    },
    body: { chatId, caseId },
    initialMessages,
    onError: async (error) => {
      console.error(error)
      toast.error("Failed to update chat. Please try again.")

      //
      // Get the last message from the database and set it as the input.
      //
      const res = await fetch(`/api/messages/${chatId}`)
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
  })

  const prevData = useRef<string | null>(null)

  useEffect(() => {
    // Check that we have received new data.
    if (
      !data ||
      data.length === 0 ||
      JSON.stringify(prevData.current) === JSON.stringify(data)
    ) {
      return
    }

    // The data stream is an array of data objects.
    // We want to always handle the last one.
    const lastData = data[data.length - 1]

    if (lastData.submittedCard) {
      onCardSubmission(lastData.submittedCard)
    } else if (lastData.articulatedCard) {
      onCardArticulation(lastData.articulatedCard)
    }

    // Save the data for the next render, to prevent it from being handled again.
    prevData.current = data
  }, [data])

  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        {messages.length ? (
          <>
            <ChatList
              messages={messages.filter((m) => isDisplayableMessage(m))}
              isFinished={isFinished}
              isLoading={isLoading}
              valueCards={valueCards}
              onManualSubmit={onManualSubmit}
              onDelete={user?.isAdmin ? onDeleteMessage : undefined}
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
