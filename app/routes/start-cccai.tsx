import { Button } from "~/components/ui/button"
import { Link, useSearchParams } from "@remix-run/react"
import Header from "~/components/header"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function StartC3AI() {
  const [isLoading, setIsLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const prolificId = searchParams.get("PROLIFIC_ID")

  if (!prolificId) {
    return <div>Missing PROLIFIC_ID</div>
  }

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center py-12">
        <div className="flex flex-col items-center mx-auto max-w-2xl text-center px-8">
          <h1 className="text-3xl font-bold mb-8">
            Welcome to Democratic Fine-Tuning!
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            You will be asked how ChatGPT should act in a morally tricky
            situation.
          </p>
          <Link to={`/cccai?PROLIFIC_ID=${prolificId}`}>
            <Button
              disabled={isLoading}
              onClick={() => {
                setIsLoading(true)
              }}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Let's Go
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
