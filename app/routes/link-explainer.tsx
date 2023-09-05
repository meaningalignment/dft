import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { useNavigate } from "@remix-run/react"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import StaticChatMessage from "~/components/static-chat-message"
import { cn } from "~/utils"

export default function LinkExplainerScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [showNext, setShowNext] = useState(false)

  const navigate = useNavigate()

  const onContinue = () => {
    setIsLoading(true)
    navigate("/link")
  }

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="flex flex-col items-center space-y-8 py-12 mx-8">
        <StaticChatMessage
          onFinished={() => {
            setShowNext(true)
          }}
          isFinished={showNext}
          text={
            "As we navigate the ever-changing landscape of life, our values naturally evolve to reflect our experiences.\n\nWe're about to present you with accounts of individuals who have undergone significant shifts in their values. Your next task is to evaluate whether you believe each person has become wiser through their journey.\n\nYou'll be engaged with three compelling stories.\n\nAre you ready?"
          }
        />
        <div
          className={cn(
            "transition-opacity ease-in duration-500",
            showNext ? "opacity-100" : "opacity-0",
            `delay-${75}`
          )}
        >
          <div className="flex flex-row mx-auto justify-center items-center space-x-2 pt-8">
            <Button disabled={!showNext} onClick={onContinue}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {"Let's Go"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
