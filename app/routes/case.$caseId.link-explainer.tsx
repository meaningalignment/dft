import Header from "~/components/header"
import { Link, useNavigate, useParams } from "@remix-run/react"
import { useState } from "react"
import StaticChatMessage from "~/components/static-chat-message"
import { cn } from "~/utils"
import ContinueButton from "~/components/continue-button"

export default function LinkExplainerScreen() {
  const { caseId } = useParams()
  const [showNext, setShowNext] = useState(false)

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
            <Link to={`/case/${caseId}/link`}>
              <ContinueButton text="Let's Go" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
