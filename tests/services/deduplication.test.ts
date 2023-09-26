import { Configuration, OpenAIApi } from "openai-edge"
import { readValue, readValues } from "../utils"
import { db } from "~/config.server"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"

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

  const result = await service.similaritySearch(value.embedding, 3, 1.0)

  expect(result).toBeDefined()
  expect(result.length).toBe(3)
}, 10_000)

test("Test clustering", async () => {
  const values = readValues("noncanonicalized.json")

  const clusters = await service.cluster(values)

  const embodiedCluster = clusters.find(
    (c) => c.findIndex((v) => v.id === 1) > -1
  )
  const empathicCluster = clusters.find(
    (c) => c.findIndex((v) => v.id === 3) > -1
  )

  expect(embodiedCluster?.length).toBeGreaterThanOrEqual(3)
  expect(empathicCluster?.length).toBeGreaterThanOrEqual(3)
}, 120_000)
