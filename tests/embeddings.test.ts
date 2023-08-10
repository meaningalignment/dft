import { PrismaClient } from "@prisma/client"
import { Configuration, OpenAIApi } from "openai-edge"
import { getCanonicalCardsWithoutEmbedding } from "~/config.server"
import DeduplicationService from "~/services/deduplication"

let service: DeduplicationService
let db: PrismaClient

beforeAll(() => {
  db = new PrismaClient()
  const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  const openai = new OpenAIApi(config)

  service = new DeduplicationService(db, openai)
})

test(`Test custom pgvector queries work`, async () => {
  const res1 = await getCanonicalCardsWithoutEmbedding()
  console.debug(res1)

  const res2 = await getCanonicalCardsWithoutEmbedding()
  console.debug(res2)

  expect(true)
})
