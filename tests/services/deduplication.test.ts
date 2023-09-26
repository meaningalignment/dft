import { Configuration, OpenAIApi } from "openai-edge"
import { readValue, readValues } from "../utils"
import { db } from "~/config.server"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"
import { ValuesCard } from "@prisma/client"

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

test("Test clustering between embodied and empathic values", async () => {
  const values = readValues("empathic_and_embodied.json")

  const clusters = await service.cluster(values)

  const embodiedCluster = clusters.find(
    (c) => c.findIndex((v) => v.id === 1) > -1
  )
  const empathicCluster = clusters.find(
    (c) => c.findIndex((v) => v.id === 3) > -1
  )

  expect(embodiedCluster?.length).toBe(4)
  expect(empathicCluster?.length).toBe(4)
}, 120_000)

test("Test clustering between embodied and empathic with some noise still works", async () => {
  const values = readValues("empathic_and_embodied.json")
  const noise = readValue("holistic_decision_making.json") as any as ValuesCard

  const clusters = await service.cluster([...values, noise])

  const embodiedCluster = clusters.find(
    (c) => c.findIndex((v) => v.id === 1) > -1
  )
  const empathicCluster = clusters.find(
    (c) => c.findIndex((v) => v.id === 3) > -1
  )

  expect(embodiedCluster?.length).toBe(4)
  expect(empathicCluster?.length).toBe(4)
}, 120_000)

test("Test clustering between two values that are somewhat similar but different", async () => {
  const values = readValues("similar_but_different.json")

  const clusters = await service.cluster(values)

  console.log(clusters)

  expect(clusters.length).toBe(2)
}, 120_000)

test("Test retrieving similar card", async () => {
  const value = {
    evaluation_criteria: [
      "HARD DATA to support the user's decision",
      "KNOWLEDGE of the outcomes of each decision",
    ],
    instructions_detailed:
      "ChatGPT should present facts and evidence that can challenge or support the user's beliefs, depending on how far ahead they are. It should also highlight the potential consequences of decisions, promoting proper decision-making.",
    instructions_short: "ChatGPT should help the user take informed decisions.",
    title: "Encouraging Real Thinking",
  }

  const result = await service.fetchSimilarCanonicalCard(value)

  expect(result).toBeDefined()
  expect(result!.id).toBe(180)
}, 60_000)
