import { createContext } from "react"

export const CaseContext = createContext<{ caseId: string } | null>(null)
