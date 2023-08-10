// This file can be used to run one-off commands.

// import { PrismaClient } from "@prisma/client"
// import { Configuration, OpenAIApi } from "openai-edge"
// import EmbeddingService from "~/services/embedding"

// let service: EmbeddingService
// let db: PrismaClient

// beforeAll(() => {
//   db = new PrismaClient()
//   const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
//   const openai = new OpenAIApi(config)

//   service = new EmbeddingService(db, openai)
// })

// test(`This test can be used to run a one-off command`, async () => {
//   await service.embedAllCards()
// }, 60_000)
