import { type Message } from "ai"

export type User = {
  id: number
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  sharePath?: string
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>
