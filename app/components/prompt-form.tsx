import * as React from "react"
import Textarea from "react-textarea-autosize"
import { UseChatHelpers } from "ai/react"

import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { IconArrowElbow, IconArrowRight, IconRefresh } from "./ui/icons"
import { useEnterSubmit } from "~/hooks/use-enter-submit"
import { Link } from "@remix-run/react"

export interface PromptProps
  extends Pick<UseChatHelpers, "input" | "setInput"> {
  onSubmit: (value: string) => Promise<void>
  isLoading: boolean
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading,
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
        if (!input?.trim()) {
          return
        }
        setInput("")
        await onSubmit(input)
      }}
      ref={formRef}
    >
      <div className="flex flex-col items-center justify-center">
        <p className="p-2 pb-4 text-md">
          You have articulated{" "}
          <a className="underline font-semibold cursor-pointer">1 value</a>.
          Would you like to continue?
        </p>
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => {
              throw Error("not implemented")
            }}
            className="bg-white"
          >
            <IconRefresh className="mr-2" />
            Articulate Another Value
          </Button>
          <Button className="ml-2">
            <IconArrowRight className="mr-2" />
            <Link to="/rank">Continue</Link>
          </Button>
        </div>
      </div>
      {/* <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-white pr-8 sm:rounded-md sm:border sm:pr-12">
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
      </div> */}
    </form>
  )
}
