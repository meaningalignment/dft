import { useFetcher } from "@remix-run/react"
import { Button, ButtonProps } from "./ui/button"
import { useState, useEffect } from "react"
import { IconSpinner } from "./ui/icons"

type BackgroundTaskButtonProps = ButtonProps & {
  task: Record<string, string>
  onData?: (data: any) => void
}

export function BackgroundTaskButton({ children, task, onData, ...props }: BackgroundTaskButtonProps) {
  const fetcher = useFetcher()
  const state = fetcher.state
  const running = state !== "idle"
  const [inFlight, setInFlight] = useState(false)
  function onClick() {
    if (running) return
    fetcher.submit({ action: 'task', ...task }, { method: "POST" })
    setInFlight(true)
  }
  useEffect(() => {
    if (!onData || !fetcher.data || !inFlight) return
    if (state === 'idle') {
      onData(fetcher.data)
      setInFlight(false)
    }
  }, [state, onData, fetcher.data, inFlight])
  return (
    <Button variant="secondary" {...props} disabled={running} onClick={onClick}>
      <IconSpinner className={`h-5 w-5 ${running ? "animate-spin mr-2" : "hidden"}`} />
      {children}
    </Button>
  )
}
