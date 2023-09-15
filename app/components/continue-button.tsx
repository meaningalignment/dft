import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"

export default function ContinueButton({ text }: { text?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Button onClick={() => setIsLoading(true)} disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {text ?? "Continue"}
    </Button>
  )
}
