import { Configuration, OpenAIApi } from "openai-edge"
import { readValue } from "../utils"
import { db } from "~/config.server"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"
import { defaultCase } from "~/lib/case"

let openai: OpenAIApi
let service: DeduplicationService

beforeAll(() => {
  openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  )
  service = new DeduplicationService(
    new EmbeddingService(openai, db),
    openai,
    db
  )
})

test("Test user distance map", async () => {
  const value = readValue("holistic_decision_making.json")

  const result = await service.similaritySearch(
    value.embedding,
    defaultCase,
    3,
    1.0
  )

  expect(result).toBeDefined()
  expect(result.length).toBe(3)
}, 10_000)
