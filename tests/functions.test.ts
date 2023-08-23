import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge"
import { seedQuestion } from "../app/lib/consts"
import { ArticulatorService } from "../app/services/articulator"
import { PrismaClient } from "@prisma/client"
import { mockDeep } from "jest-mock-extended"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"

let articulator: ArticulatorService
let openai: OpenAIApi

beforeAll(() => {
  openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  )
  articulator = new ArticulatorService(
    'default',
    mockDeep<DeduplicationService>(),
    mockDeep<EmbeddingService>(),
    openai,
    mockDeep<PrismaClient>()
  )
})

test(`Articulation of a card when there is too little information generates a critique`, async () => {
  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: articulator.config.prompts.main.prompt },
    { role: "assistant", content: seedQuestion },
    {
      role: "user",
      content: "She should do what is right to do as a christian.",
    },
  ]

  const response = await articulator.articulateValuesCard(messages, null)

  console.log(`Values Card Critique: ${response.critique}`)

  expect(response.critique).not.toBeUndefined()
  expect(response.critique).not.toBeNull()
  expect(response.critique).not.toBe("")
}, 60_000)
