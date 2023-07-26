import React, { useState } from "react"
import { useChat, type Message } from "ai/react"
import { cn } from "../utils"
import { ChatList } from "./chat-list"
import { ChatPanel } from "./chat-panel"
import { EmptyScreen } from "./empty-screen"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { toast } from "react-hot-toast"
import { ValuesCard as ValuesCardType } from "~/lib/consts"

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[]
  id?: string
}

function ValuesCard({ card }: { card: ValuesCardType }) {
  return (
    <div className="mt-4 border border-2 border-stone-300 rounded-xl p-8 max-w-[420px]">
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructions_short}</p>
      <p className="text-sm font-bold pt-2 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructions_detailed}</p>
    </div>
  )
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [valuesCard, setValuesCard] = useState<ValuesCardType | null>(null)
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      id,
      api: "/api/chat",
      headers: {
        "Content-Type": "application/json",
      },
      initialMessages,
      onResponse: async (response) => {
        if (response.headers.has("X-Values-Card")) {
          setValuesCard(
            JSON.parse(response.headers.get("X-Values-Card")!) as ValuesCardType
          )
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
