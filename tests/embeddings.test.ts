// // This file can be used to run one-off commands.

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
//   const userId = 1

//   const res = (await db.$queryRaw`
//   SELECT embedding::text
//   FROM "ValuesCard" vc
//   INNER JOIN "Chat" c
//   ON vc."chatId" = c."id"
//   WHERE c."userId" = ${userId}
//   AND vc."embedding" IS NOT NULL`) as { embedding: any }[]

//   const embeddings = res.map((r) =>
//     JSON.parse(r.embedding).map((f: any) => parseFloat(f))
//   )

//   console.log(embeddings)
// }, 60_000)
