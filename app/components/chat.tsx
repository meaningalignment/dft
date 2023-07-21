import React from "react"
import { useChat, type Message } from "ai/react"
import { cn } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ChatCompletionRequestMessageFunctionCall } from "openai-edge"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      id,
      api: "/api/chat",
      initialMessages,
      body: {
        id,
      },
      headers: {
        "Content-Type": "application/json",
      },
      experimental_onFunctionCall: async (
        chatMessages: Message[],
        functionCall: ChatCompletionRequestMessageFunctionCall
      ) => {
        console.log("On Function call")
        console.log(chatMessages)
        console.log(functionCall)
      },
      onFinish(message) {
        console.log("On Finish")
        console.log(message)
      },
      onResponse: async (response) => {
        console.log("On Response")
        console.log(response)

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
            <ChatList messages={messages} />
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
