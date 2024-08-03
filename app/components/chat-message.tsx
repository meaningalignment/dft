import { Message } from "ai"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { cn } from "../utils"
import { CodeBlock } from "./ui/codeblock"
import { MemoizedReactMarkdown } from "./markdown"
import { IconOpenAI, IconUser } from "./ui/icons"
import { ChatMessageActions } from "./chat-message-actions"

export interface ChatMessageProps {
  message: Message
  hideActions?: boolean
  onDelete?: (message: Message) => void
}

function MessageContent({ message }: { message: Message }) {
  if (message.role === 'function') {
    return <pre className="text-sm text-neutral-500 whitespace-pre-wrap">{message.content}</pre>
  } else if (message.function_call) {
    return <pre className="text-sm text-neutral-500 whitespace-pre-wrap">{JSON.stringify(message)}</pre>
  } else return (
    <MemoizedReactMarkdown
      className="prose break-words prose-p:leading-relaxed prose-pre:p-0"
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        code({ node, inline, className, children, ...props }) {
          if (children.length) {
            if (children[0] == "▍") {
              return (
                <span className="mt-1 animate-pulse cursor-default">▍</span>
              )
            }

            children[0] = (children[0] as string).replace("`▍`", "▍")
          }

          const match = /language-(\w+)/.exec(className || "")

          if (inline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }

          return (
            <CodeBlock
              key={Math.random()}
              language={(match && match[1]) || ""}
              value={String(children).replace(/\n$/, "")}
              {...props}
            />
          )
        },
      }}
    >
      {message.content}
    </MemoizedReactMarkdown>
  )
}


export function ChatMessage({
  message,
  hideActions,
  ...props
}: ChatMessageProps) {
  return (
    <div
      className={cn("group relative mb-4 flex items-start md:-ml-12")}
      {...props}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
          message.role === "user"
            ? "bg-white"
            : "bg-primary text-primary-foreground"
        )}
      >
        {message.role === "user" ? <IconUser /> : <IconOpenAI />}
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <MessageContent message={message} />
        {!hideActions && (
          <ChatMessageActions message={message} onDelete={props.onDelete} />
        )}
      </div>
    </div>
  )
}
