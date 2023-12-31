import { useContext, useRef, useEffect, useState } from "react"
import Textarea from "react-textarea-autosize"
import { UseChatHelpers } from "ai/react"

import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { IconArrowElbow, IconArrowRight, IconRefresh } from "./ui/icons"
import { useEnterSubmit } from "~/hooks/use-enter-submit"
import { useCurrentUserValues } from "~/root"
import { ChatContext } from "~/context/case"
import { Loader2 } from "lucide-react"
import va from "@vercel/analytics"

export interface PromptProps
  extends Pick<UseChatHelpers, "input" | "setInput"> {
  onSubmit: (value: string) => Promise<void>
  isLoading: boolean
  isFinished?: boolean
}

function ArticulateAnotherButton({ caseId }: { caseId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button
      variant="outline"
      className="bg-white"
      onClick={() => {
        setIsLoading(true)
        window.location.href = `/case/${caseId}/chat`
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <IconRefresh className="mr-2" />
      )}
      Articulate Another Value
    </Button>
  )
}

function FinishedView() {
  const { caseId } = useContext(ChatContext)!
  const values = useCurrentUserValues()
  const count = (values?.length ?? 0) + 1
  const suffix = count === 1 ? "" : "s"
  const [isLoading, setIsLoading] = useState(false)

  const onContinue = () => {
    setIsLoading(true)
    va.track("Finished Chat")

    // Hard reset to prevent state reuse issues.
    window.location.href = `/case/${caseId}/select`
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="p-2 pb-4 text-md">
        {"You have articulated "}
        <a className="underline font-semibold">
          {count} value{suffix}
        </a>
        . Would you like to continue?
      </p>
      <div className="flex justify-center pt-2">
        <ArticulateAnotherButton caseId={caseId} />
        <Button disabled={isLoading} onClick={onContinue} className="ml-2">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <IconArrowRight className="mr-2" />
          )}
          Continue
        </Button>
      </div>
    </div>
  )
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading,
  isFinished,
}: PromptProps) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!input?.trim()) {
          return
        }
        setInput("")
        await onSubmit(input)
      }}
      ref={formRef}
    >
      {(isFinished && <FinishedView />) || (
        <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-white pr-8 sm:rounded-md sm:border sm:pr-12">
          <Textarea
            ref={inputRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message."
            spellCheck={false}
            className="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
          />
          <div className="absolute right-0 top-4 sm:right-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || input === ""}
                >
                  <IconArrowElbow />
                  <span className="sr-only">Send message</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </form>
  )
}
