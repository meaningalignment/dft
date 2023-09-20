import { Suspense, useEffect, useLayoutEffect, useState } from "react"
import { ChatMessage } from "./chat-message"

type Props = {
  text: string
  isFinished: boolean
  onFinished: () => void
  role?: "assistant" | "user"
}

export default function StaticChatMessage({
  text,
  isFinished,
  onFinished,
  role,
}: Props) {
  const [currentText, setCurrentText] = useState("")

  useLayoutEffect(() => {
    console.log(
      `Static chat message called. isFinished: ${isFinished}. Current text: ${currentText}. Text: ${text}`
    )

    if (isFinished) {
      setCurrentText(text)
      return
    }

    setCurrentText("")

    let wordArray = text.split(" ")
    let current = ""
    let i = 0

    // Function to add next word
    const addNextWord = () => {
      current += (i === 0 ? "" : " ") + wordArray[i]
      setCurrentText(current)
      i += 1

      if (i < wordArray.length) {
        setTimeout(addNextWord, 50)
      } else {
        onFinished()
      }
    }

    // Start adding words
    addNextWord()
  }, [])

  return (
    <div className="w-full max-w-2xl flex items-stretch">
      <ChatMessage
        hideActions={true}
        message={{
          id: "1",
          content: currentText,
          role: role ?? "assistant",
        }}
      />
    </div>
  )
}
