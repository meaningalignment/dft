import { cn } from "~/utils"
import { IconOpenAI } from "./ui/icons"
import { Loader2 } from "lucide-react"
import { useContext, useEffect, useState } from "react"
import { ChatContext } from "~/context/case"

export default function ChatMessageLoading() {
  const { chatId } = useContext(ChatContext)!
  const [currentFunction, setCurrentFunction] = useState<string | null>(null)

  // Poll for the current function call.
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/chat/${chatId}/function`)
      const json = await res.json()

      if (json && json.function) {
        setCurrentFunction(json.function)
      }
    }

    fetchData()

    const interval = setInterval(fetchData, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className={cn("group relative mb-4 flex items-start md:-ml-12")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow bg-primary text-primary-foreground"
        )}
      >
        <IconOpenAI />
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <div className="flex flex-row align-center">
          {currentFunction ? (
            <div className="bg-white rounded-md px-2 py-1 ml-2 border border-border animate-pulse flex flex-row align-center justify-center gap-1">
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">{currentFunction}</span>
            </div>
          ) : (
            <Loader2 className="mt-2 h-4 w-4 animate-spin" />
          )}
        </div>
      </div>
    </div>
  )
}
