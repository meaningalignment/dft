import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge"
import { seedQuestion, systemPrompt } from "../app/lib/consts"
import { FunctionsService } from "../app/services/functions"
import { PrismaClient } from "@prisma/client"
import { mockDeep } from "jest-mock-extended"

let functions: FunctionsService
let openai: OpenAIApi

const model = "gpt-4-0613"

beforeAll(() => {
  openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  )
  functions = new FunctionsService(openai, model, mockDeep<PrismaClient>())
})

test(`Articulation of a card when there is too little information generates a critique`, async () => {
  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: seedQuestion },
    {
      role: "user",
      content: "She should do what is right to do as a christian.",
    },
  ]

  const response = await functions.articulateValuesCard(messages, null)

  console.log(`Values Card Critique: ${response.critique}`)

  expect(response.critique).not.toBeUndefined()
  expect(response.critique).not.toBeNull()
  expect(response.critique).not.toBe("")
}, 60_000)
