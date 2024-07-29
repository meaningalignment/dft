import { DeduplicatedCard, ValuesCard } from "@prisma/client"
import OpenAI from "openai"
import { db, inngest } from "~/config.server"
import { calculateAverageEmbedding } from "~/utils"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * This service is responsible for embedding cards.
 *
 * `pgvector` is not supported by Prisma, hence the raw queries.
 */
export default class EmbeddingService {
  private toEmbeddingString(card: { evaluationCriteria: string[] }) {
    return card.evaluationCriteria.sort().join("\n")
  }

  private async embed(str: string): Promise<number[]> {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: str,
      dimensions: 1536,
    })
    return res.data[0].embedding
  }

  async embedDeduplicatedCard(card: DeduplicatedCard): Promise<void> {
    // Embed card.
    const input = this.toEmbeddingString(card)
    const embedding = await this.embed(input)

    // Update in DB.
    await db.$executeRaw`UPDATE "DeduplicatedCard" SET embedding = ${JSON.stringify(
      embedding
    )}::vector WHERE id = ${card.id};`
  }

  async embedNonCanonicalCard(card: ValuesCard): Promise<void> {
    // Embed card.
    const input = this.toEmbeddingString(card)
    const embedding = await this.embed(input)

    // Update in DB.
    await db.$executeRaw`UPDATE "ValuesCard" SET embedding = ${JSON.stringify(
      embedding
    )}::vector WHERE id = ${card.id};`
  }

  async embedCandidate(card: {
    evaluationCriteria: string[]
  }): Promise<number[]> {
    const syntheticCard = {
      evaluationCriteria: card.evaluationCriteria ?? [],
    } as ValuesCard

    const input = this.toEmbeddingString(syntheticCard)
    return this.embed(input)
  }

  async getNonCanonicalCardsWithoutEmbedding(): Promise<Array<ValuesCard>> {
    return (await db.$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria" FROM "ValuesCard" WHERE "ValuesCard".embedding IS NULL`) as ValuesCard[]
  }

  async getDeduplicatedCardsWithoutEmbedding(): Promise<
    Array<DeduplicatedCard>
  > {
    return (await db.$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria", embedding::text FROM "DeduplicatedCard" WHERE "DeduplicatedCard".embedding IS NULL`) as DeduplicatedCard[]
  }

  async getUserEmbedding(userId: number): Promise<number[]> {
    try {
      const userEmbeddings: Array<Array<number>> = (
        await db.$queryRaw<
          Array<{ embedding: any }>
        >`SELECT embedding::text FROM "ValuesCard" vc INNER JOIN "Chat" c  ON vc."chatId" = c."id" WHERE c."userId" = ${userId} AND vc."embedding" IS NOT NULL`
      ).map((r) => JSON.parse(r.embedding).map((v: any) => parseFloat(v)))

      console.log(
        `Got embedding vector for user ${userId}. Calculating average.`
      )

      return calculateAverageEmbedding(userEmbeddings)
    } catch (e) {
      console.error(e)
      return new Array(1536).fill(0)
    }
  }
}

//
// Ingest function for embedding.
//

export const embed = inngest.createFunction(
  { name: "Embed all cards" },
  { event: "embed" },
  async ({ step, logger }) => {
    //
    // Prepare the service.
    //
    const service = new EmbeddingService()

    const deduplicatedCards = (await step.run(
      "Fetching deduplicated cards",
      async () => service.getDeduplicatedCardsWithoutEmbedding()
    )) as any as DeduplicatedCard[]

    const nonCanonicalCards = (await step.run(
      "Fetching canonical cards",
      async () => service.getNonCanonicalCardsWithoutEmbedding()
    )) as any as ValuesCard[]

    for (const card of deduplicatedCards) {
      await step.run("Embed deduplocated card", async () => {
        await service.embedDeduplicatedCard(card)
      })
    }

    for (const card of nonCanonicalCards) {
      await step.run("Embed non-canonical card", async () => {
        await service.embedNonCanonicalCard(card)
      })
    }

    logger.info(
      `Embedded ${deduplicatedCards.length} canonical cards and ${nonCanonicalCards.length} non-canonical cards.`
    )

    return {
      message: `Embedded ${deduplicatedCards.length} canonical cards and ${nonCanonicalCards.length} non-canonical cards.`,
    }
  }
)

export const embeddingService = new EmbeddingService()
