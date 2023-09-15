import { Configuration, OpenAIApi } from "openai-edge"
import { ArticulatorService } from "../../app/services/articulator"
import { PrismaClient } from "@prisma/client"
import { mockDeep } from "jest-mock-extended"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"
import { readTranscript } from "../utils"

let articulator: ArticulatorService
let openai: OpenAIApi

beforeAll(() => {
  openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  )
  articulator = new ArticulatorService(
    "default",
    mockDeep<DeduplicationService>(),
    mockDeep<EmbeddingService>(),
    openai,
    mockDeep<PrismaClient>()
  )
})

// test(`Articulation of a card when there is too little information generates a critique`, async () => {
//   const messages: ChatCompletionRequestMessage[] = [
//     { role: "system", content: articulator.config.prompts.main.prompt },
//     { role: "assistant", content: defaultSeedQuestion },
//     {
//       role: "user",
//       content: "She should do what is right to do as a christian.",
//     },
//   ]

//   const response = await articulator.articulateValuesCard(messages, null)

//   console.log(`Values Card Critique: ${response.critique}`)

//   expect(response.critique).not.toBeUndefined()
//   expect(response.critique).not.toBeNull()
//   expect(response.critique).not.toBe("")
// }, 60_000)

test("Test Ellie's articulation results in card without critque", async () => {
  const messages = readTranscript("ellie_articulation.json")
  const card = {
    title: "Intuition-Guided Decisions",
    instructions_short: "ChatGPT should help the girl feel into her intuition.",
    evaluation_criteria: [
      "FEELINGS of deep immersion and engagement in the work",
      "SENSE of aliveness and opening up to a new world",
      "GUT FEELINGS that guide towards a decision",
      "UNCERTAINTY that accompanies the intuition-driven decision",
    ],
    instructions_detailed:
      "ChatGPT can help her identify feelings of deep immersion, sense of aliveness, gut feelings, and the accompanying uncertainty which, together, add up to an embodied sense of what her intuition is guiding her towards.",
  }

  const result = await articulator.articulateValuesCard(messages, card)

  expect(
    result.critique === null ||
      result.critique === undefined ||
      result.critique === ""
  ).toBe(true)
}, 60_000)
