import * as React from "react"
import Textarea from "react-textarea-autosize"
import type { UseChatHelpers } from "ai/react"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { IconArrowElbow, IconArrowRight } from "./ui/icons"
import { useEnterSubmit } from "~/hooks/use-enter-submit"
import { Link, useParams } from "@remix-run/react"
import LoadingButton from "./loading-button"

export interface PromptProps
  extends Pick<UseChatHelpers, "input" | "setInput"> {
  onSubmit: (value: string) => Promise<void>
  isLoading: boolean
  isFinished?: boolean
}

const FinishedView = () => {
  const { caseId } = useParams()
  
  const continueUrl = `/case/${caseId}/select`

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="p-2 pb-4 text-sm text-gray-600">
        Thank you for sharing your story!
      </p>
      <div className="flex justify-center pt-2">
        <LoadingButton iconRight={<IconArrowRight className="ml-2" />}>
          <Link to={continueUrl} prefetch="render" className="flex flex-row items-center justify-center">
            Continue
          </Link>
        </LoadingButton>
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
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (isLoading || !input?.trim()) {
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
