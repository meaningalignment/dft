import { type UseChatHelpers } from "ai/react"
import { Button } from "./ui/button"
import { PromptForm } from "./prompt-form"
import { ButtonScrollToBottom } from "./button-scroll-to-bottom"
import { IconRefresh, IconStop } from "./ui/icons"
import { FooterText } from "./footer"
import { useContext } from "react"
import { ChatContext } from "~/context/case"

export interface ChatPanelProps
  extends Pick<
    UseChatHelpers,
    | "append"
    | "isLoading"
    | "reload"
    | "messages"
    | "stop"
    | "input"
    | "setInput"
  > {
  id?: string
  isFinished?: boolean
}

export function ChatPanel({
  isLoading,
  isFinished,
  stop,
  append,
  reload,
  input,
  setInput,
  messages,
}: ChatPanelProps) {
  const { chatId } = useContext(ChatContext)!

  return (
    <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-muted/10 from-10% to-muted/30 to-50%">
      <ButtonScrollToBottom />
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="flex mb-2 h-10 items-center justify-center">
          {isLoading ? (
            <Button
              variant="outline"
              onClick={() => stop()}
              className="bg-white"
            >
              <IconStop className="mr-2" />
              Stop generating
            </Button>
          ) : (
            messages?.length > 1 &&
            !isFinished && (
              <>
                <Button
                  variant="outline"
                  onClick={() => reload()}
                  className="bg-white"
                >
                  <IconRefresh className="mr-2" />
                  Regenerate response
                </Button>
              </>
            )
          )}
        </div>
        <div className="space-y-4 border-t bg-white px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          <PromptForm
            onSubmit={async (value) => {
              await append({
                id: chatId,
                content: value,
                role: "user",
              })
            }}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            isFinished={isFinished}
          />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
