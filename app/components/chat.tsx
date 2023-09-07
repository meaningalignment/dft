import React, { useEffect, useState } from "react"
import { useChat, type Message } from "ai/react"
import { cn, isAdmin } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ValuesCardData } from "~/lib/consts"
import { useRevalidator, useSearchParams } from "@remix-run/react"
import { useCurrentUser } from "~/root"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  hasSubmitted?: boolean
  id: string
}

export function Chat({
  id,
  initialMessages,
  hasSubmitted,
  className,
}: ChatProps) {
  const user = useCurrentUser()
  const revalidator = useRevalidator()
  const [valueCards, setValueCards] = useState<
    { position: number; card: ValuesCardData }[]
  >([])
  const [isFinished, setIsFinished] = useState(hasSubmitted || false)
  const [searchParams] = useSearchParams()

  // Recover the state of a conversation.
  useEffect(() => {
    if (!initialMessages) return
    let newMessages: Message[] = []
    let valuesCards: { position: number; card: ValuesCardData }[] = []

    for (const message of initialMessages) {
      if (message.name === "show_values_card") {
        try {
          const card = JSON.parse(message.content)
          valuesCards.push({
            position: newMessages.length,
            card,
          })
        } catch (e) {
          continue // We use the same function signature for the reply message, that is not json.
        }
      } else if (
        (message.role === "assistant" && message.content) ||
        message.role === "user"
      ) {
        newMessages.push(message)
      }
    }

    setMessages(newMessages)
    setValueCards(valuesCards)
  }, [initialMessages])

  const onCardArticulation = (card: ValuesCardData) => {
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

  const onCardSubmission = (card: ValuesCardData) => {
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

  const onDeleteMessage = async (message: Message) => {
    await fetch(`/api/messages/${id}/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: id,
        message,
      }),
    })

    revalidator.revalidate()
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
      "X-Articulator-Config":
        searchParams.get("articulatorConfig") || "default",
      "Content-Type": "application/json",
    },
    body: {
      chatId: id,
    },
    initialMessages,
    onResponse: async (response) => {
      const articulatedCard = response.headers.get("X-Articulated-Card")
      if (articulatedCard) {
        onCardArticulation(JSON.parse(articulatedCard) as ValuesCardData)
      }

      const submittedCard = response.headers.get("X-Submitted-Card")
      if (submittedCard) {
        onCardSubmission(JSON.parse(submittedCard) as ValuesCardData)
      }

      if (response.status === 401) {
        console.error(response.status)
        toast.error("Failed to update chat. Please try again.")
      }
    },
    onError: async (error) => {
      console.error(error)
      toast.error("Failed to update chat. Please try again.")

      //
      // Get the last message from the database and set it as the input.
      //
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
    onFinish: async (message) => {
      console.log("Chat finished:", message)
      console.log("messages:", messages)

      // Save messages in the database.
      await fetch(`/api/messages/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: id,
          messages: [
            ...messages,
            {
              role: "user",
              content: input,
            },
            message,
          ],
        }),
      })
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
              // TODO user table admin flag.
              onDelete={isAdmin(user) ? onDeleteMessage : undefined}
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
