import { useAssistant } from "ai/react"
import { PromptForm } from "./prompt-form"
import { ButtonScrollToBottom } from "./button-scroll-to-bottom"
import { FooterText } from "./footer"

type UseAssistantHelpers = ReturnType<typeof useAssistant>

export interface ChatPanelProps
  extends Pick<
    UseAssistantHelpers,
    | "append"
    | "messages"
    | "input"
    | "setInput"
    | "status"
  > {
  isFinished?: boolean
}

export function ChatPanel({
  isFinished,
  append,
  input,
  setInput,
  status,
}: ChatPanelProps) {

  return (
    <div className="fixed inset-x-0 bottom-0 light:bg-gradient-to-b from-muted/10 from-10% to-muted/30 to-50%">
      <ButtonScrollToBottom />
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="flex mb-2 h-10 items-center justify-center">
        </div>
        <div className="space-y-4 border-t bg-white px-4 py-2 shadow-lg sm:rounded-t-xl sm:border pb-8 md:py-4">
          <PromptForm
            onSubmit={async (value: any) => {
              await append({
                content: value,
                role: "user",
              })
            }}
            input={input}
            setInput={setInput}
            isLoading={status === "in_progress"}
            isFinished={isFinished && status !== "in_progress"}
          />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
