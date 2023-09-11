import { createContext } from "react"

export const ChatContext = createContext<{
  chatId: string
  caseId: string
} | null>(null)
