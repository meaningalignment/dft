import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"
import va from "@vercel/analytics"

export default function ContinueButton({
  text,
  event,
}: {
  text?: string
  event?: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button
      onClick={() => {
        setIsLoading(true)
        if (event) va.track(event)
      }}
      disabled={isLoading}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {text ?? "Continue"}
    </Button>
  )
}
