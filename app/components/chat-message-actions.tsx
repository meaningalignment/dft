import { type Message } from "ai"

import { Button } from "./ui/button"
import { IconArrowDown, IconCheck, IconCopy, IconStop } from "./ui/icons"
import { CrossCircledIcon } from "@radix-ui/react-icons"
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard"
import { cn } from "../utils"
import { seedQuestion } from "~/lib/consts"

interface ChatMessageActionsProps extends React.ComponentProps<"div"> {
  message: Message
  onDelete?: (message: Message) => void
}

export function ChatMessageActions({
  message,
  className,
  ...props
}: ChatMessageActionsProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const onCopy = () => {
    if (isCopied) return
    copyToClipboard(message.content)
  }

  const onDelete = () => {
    props.onDelete?.(message)
  }

  return (
    <div
      className={cn(
        "flex items-center justify-end transition-opacity group-hover:opacity-100 md:absolute md:-right-10 md:-top-2 md:opacity-0",
        className
      )}
      {...props}
    >
      <Button variant="ghost" size="icon" onClick={onCopy}>
        {isCopied ? <IconCheck /> : <IconCopy />}
        <span className="sr-only">Copy message</span>
      </Button>

      {props.onDelete && message.content !== seedQuestion && (
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <CrossCircledIcon />
          <span className="sr-only">Delete Message</span>
        </Button>
      )}
    </div>
  )
}
