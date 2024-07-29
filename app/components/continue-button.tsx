import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"
import va from "@vercel/analytics"
import { useNavigate } from "@remix-run/react"

export default function ContinueButton({
  text,
  event,
  to,
}: {
  text?: string
  event?: string
  to?: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  return (
    <Button
      onClick={() => {
        setIsLoading(true)
        if (event) va.track(event)
        setTimeout(() => { setIsLoading(false) }, 10000)
        if (to) navigate(to)
      }}
      disabled={isLoading}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {text ?? "Continue"}
    </Button>
  )
}
