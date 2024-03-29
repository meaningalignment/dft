import { CanonicalValuesCard, DeduplicatedCard, PrismaClient, ValuesCard } from "@prisma/client"
import { Configuration, OpenAIApi } from "openai-edge"
import { db, inngest, openai } from "~/config.server"
import { calculateAverageEmbedding } from "~/utils"

/**
 * This service is responsible for embedding cards.
 *
 * `pgvector` is not supported by Prisma, hence the raw queries.
 */
export default class EmbeddingService {
  private openai: OpenAIApi
  private db: PrismaClient

  constructor(openai: OpenAIApi, db: PrismaClient) {
    this.openai = openai
    this.db = db
  }

  private toEmbeddingString(card: { evaluationCriteria: string[] }) {
    return card.evaluationCriteria.join("\n")
  }

  private async embed(str: string): Promise<number[]> {
    const res = await this.openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: str,
    })
    const body = await res.json()
    return body.data[0].embedding
  }

  async embedCanonicalCard(card: CanonicalValuesCard): Promise<void> {
    // Embed card.
    const input = this.toEmbeddingString(card)
    const embedding = await this.embed(input)

    // Update in DB.
    await this.db
      .$executeRaw`UPDATE "CanonicalValuesCard" SET embedding = ${JSON.stringify(
        embedding
      )}::vector WHERE id = ${card.id};`
  }

  async embedDeduplicatedCard(card: DeduplicatedCard): Promise<void> {
    // Embed card.
    const input = this.toEmbeddingString(card)
    const embedding = await this.embed(input)

    // Update in DB.
    await this.db
      .$executeRaw`UPDATE "DeduplicatedCard" SET embedding = ${JSON.stringify(
        embedding
      )}::vector WHERE id = ${card.id};`
  }

  async embedNonCanonicalCard(card: ValuesCard): Promise<void> {
    // Embed card.
    const input = this.toEmbeddingString(card)
    const embedding = await this.embed(input)

    // Update in DB.
    await this.db
      .$executeRaw`UPDATE "ValuesCard" SET embedding = ${JSON.stringify(
        embedding
      )}::vector WHERE id = ${card.id};`
  }

  async embedCandidate(card: { evaluationCriteria: string[] }): Promise<number[]> {
    const syntheticCard = {
      evaluationCriteria: card.evaluationCriteria ?? [],
    } as ValuesCard

    const input = this.toEmbeddingString(syntheticCard)
    return this.embed(input)
  }

  async getNonCanonicalCardsWithoutEmbedding(): Promise<Array<ValuesCard>> {
    return (await this.db
      .$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria" FROM "ValuesCard" WHERE "ValuesCard".embedding IS NULL`) as ValuesCard[]
  }

  async getDeduplicatedCardsWithoutEmbedding(): Promise<
    Array<DeduplicatedCard>
  > {
    return (await this.db
      .$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria", embedding::text FROM "DeduplicatedCard" WHERE "DeduplicatedCard".embedding IS NULL`) as DeduplicatedCard[]
  }

  async getCanonicalCardsWithoutEmbedding(): Promise<
    Array<CanonicalValuesCard>
  > {
    return (await this.db
      .$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria", embedding::text FROM "CanonicalValuesCard" WHERE "CanonicalValuesCard".embedding IS NULL`) as CanonicalValuesCard[]
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

  async findValuesSimilarTo(
    vector: number[],
    values: CanonicalValuesCard[] | null,
    limit: number = 10
  ): Promise<Array<CanonicalValuesCard>> {
    const query = `SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> '${JSON.stringify(
      vector
    )}'::vector as "_distance"
    FROM "CanonicalValuesCard" cvc
    WHERE cvc.id IN (${values!.map((c) => c.id).join(",")})
    ORDER BY "_distance" ASC
    LIMIT ${limit};`

    return this.db.$queryRawUnsafe<
      Array<CanonicalValuesCard & { _distance: number }>
    >(query)
  }

  async getEmbedding(card: CanonicalValuesCard) {
    const embedding = await db.$queryRaw<Array<{ embedding: any }>>`SELECT embedding::text FROM "CanonicalValuesCard" cvc WHERE cvc."id" = ${card.id}`
    if (!embedding.length) throw new Error("Card not found")
    if (embedding[0].embedding === null) throw new Error("Embedding is null")
    return embedding[0].embedding as number[]
  }

  async getSimilarCards(card: CanonicalValuesCard) {
    const vector = await this.getEmbedding(card)
    const results = await db.$queryRaw<Array<CardPlusDistance>>`SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> ${vector}::vector as "_distance" FROM "CanonicalValuesCard" cvc WHERE cvc.id <> ${card.id} ORDER BY "_distance" ASC LIMIT 10`
    return results.filter(r => r._distance < 0.11)
  }
}

interface CardPlusDistance extends CanonicalValuesCard {
  _distance: number
}

//
// Ingest function for embedding.
//

export const embed = inngest.createFunction(
  { name: "Embed all cards" },
  { event: "embed" },
  async ({ event, step, logger }) => {
    //
    // Prepare the service.
    //
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)
    const service = new EmbeddingService(openai, db)

    const canonicalCards = (await step.run(
      "Fetching canonical cards",
      async () => service.getCanonicalCardsWithoutEmbedding()
    )) as any as CanonicalValuesCard[]

    const deduplicatedCards = (await step.run(
      "Fetching deduplicated cards",
      async () => service.getDeduplicatedCardsWithoutEmbedding()
    )) as any as DeduplicatedCard[]


    const nonCanonicalCards = (await step.run(
      "Fetching canonical cards",
      async () => service.getNonCanonicalCardsWithoutEmbedding()
    )) as any as ValuesCard[]

    logger.info(
      `About to embed ${canonicalCards.length} canonical cards and ${nonCanonicalCards.length} non-canonical cards.`
    )

    for (const card of canonicalCards) {
      await step.run("Embed canonical card", async () => {
        await service.embedCanonicalCard(card)
      })
    }

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
      `Embedded ${canonicalCards.length} canonical cards and ${nonCanonicalCards.length} non-canonical cards.`
    )

    return {
      message: `Embedded ${canonicalCards.length} canonical cards and ${nonCanonicalCards.length} non-canonical cards.`,
    }
  }
)

export const embeddingService = new EmbeddingService(openai, db)
