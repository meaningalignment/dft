import Header from "~/components/header"
import { Link, useParams } from "@remix-run/react"
import { useState } from "react"
import StaticChatMessage from "~/components/static-chat-message"
import { cn } from "~/utils"
import ContinueButton from "~/components/continue-button"

export default function ChatExplainerScreen() {
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
          text={`This process has 3 steps.\n\nIn the first step, you will articulate a value for ChatGPT responding to the user story you selected. This usually takes around 5-10 minutes.\n\nNote: Only the values you articulate will be shared, not the chat content.`}
        />
        <div
          className={cn(
            "transition-opacity ease-in duration-500",
            showNext ? "opacity-100" : "opacity-0",
            `delay-${75}`
          )}
        >
          <div className="flex flex-row mx-auto justify-center items-center space-x-2 pt-8">
            <Link to={`/case/${caseId}/chat`}>
              <ContinueButton event="Started Chat" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
