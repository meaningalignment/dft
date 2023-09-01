import { useEffect, useState } from "react"
import { ChatMessage } from "./chat-message"

export default function StaticChatMessage({
  text,
  isFinished,
  onFinished,
}: {
  text: string
  isFinished: boolean
  onFinished: () => void
}) {
  const [currentText, setCurrentText] = useState("")

  useEffect(() => {
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
  }, [text])

  return (
    <div className="w-full max-w-2xl flex items-stretch">
      <ChatMessage
        hideActions={true}
        message={{
          id: "1",
          content: currentText,
          role: "assistant",
        }}
      />
    </div>
  )
}
