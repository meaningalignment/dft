import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { OpenAIApi } from "openai-edge"
import { ValuesCardCandidate } from "~/lib/consts"

/**
 * This service is responsible for embedding cards.
 *
 * `pgvector` is not supported by Prisma, hence the raw queries.
 */
export default class EmbeddingService {
  private openai: OpenAIApi
  private db: PrismaClient

  constructor(db: PrismaClient, openai: OpenAIApi) {
    this.openai = openai
    this.db = db
  }

  private formatCard(card: ValuesCard | CanonicalValuesCard) {
    return (
      "Short Instruction: " +
      card.instructionsShort +
      "\n" +
      "Long Instruction: " +
      card.instructionsDetailed +
      "\n" +
      "In order to evaluate whether or not ChatGPT is following this value, it could look for: " +
      "\n" +
      card.evaluationCriteria.join("\n")
    )
  }

  private async embed(str: string): Promise<number[]> {
    const res = await this.openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: str,
    })
    const body = await res.json()
    return body.data[0].embedding
  }

  async embedCanonicalCard(card: CanonicalValuesCard): Promise<number> {
    // Embed card.
    const input = this.formatCard(card)
    const embedding = await this.embed(input)

    // Update in DB.
    return this.db
      .$executeRaw`UPDATE "CanonicalValuesCard" SET embedding = ${JSON.stringify(
      embedding
    )}::vector WHERE id = ${card.id};`
  }

  async embedNonCanonicalCard(card: ValuesCard): Promise<number> {
    // Embed card.
    const input = this.formatCard(card)
    const embedding = await this.embed(input)

    // Update in DB.
    return this.db
      .$executeRaw`UPDATE "ValuesCard" SET embedding = ${JSON.stringify(
      embedding
    )}::vector WHERE id = ${card.id};`
  }

  async embedCandidate(card: ValuesCardCandidate): Promise<number[]> {
    const syntheticCard = {
      instructionsShort: card.instructions_short,
      instructionsDetailed: card.instructions_detailed,
      evaluationCriteria: card.evaluation_criteria ?? [],
    } as ValuesCard

    const input = this.formatCard(syntheticCard)
    return this.embed(input)
  }

  async getNonCanonicalCardsWithoutEmbedding(): Promise<Array<ValuesCard>> {
    return (await this.db
      .$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria" FROM "ValuesCard" WHERE "ValuesCard".embedding IS NULL`) as ValuesCard[]
  }

  async getCanonicalCardsWithoutEmbedding(): Promise<
    Array<CanonicalValuesCard>
  > {
    return (await this.db
      .$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria", embedding::text FROM "CanonicalValuesCard" WHERE "CanonicalValuesCard".embedding IS NULL`) as CanonicalValuesCard[]
  }

  async similaritySearch(
    vector: number[],
    limit: number = 10
  ): Promise<Array<CanonicalValuesCard>> {
    return this.db.$queryRaw<Array<CanonicalValuesCard>>`
    SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> ${JSON.stringify(
      vector
    )}::vector as "_distance" 
    FROM "CanonicalValuesCard" cvc
    ORDER BY "_distance" DESC
    LIMIT ${limit};`
  }

  async embedAllCards() {
    const canonicalCards = await this.getCanonicalCardsWithoutEmbedding()
    const nonCanonicalCards = await this.getNonCanonicalCardsWithoutEmbedding()

    console.log(
      `About to embed ${canonicalCards.length} canonical cards and ${nonCanonicalCards.length} non-canonical cards.`
    )

    let promises = []

    for (const card of canonicalCards) {
      promises.push(this.embedCanonicalCard(card))
    }

    for (const card of nonCanonicalCards) {
      promises.push(this.embedNonCanonicalCard(card))
    }

    await Promise.all(promises)
  }
}
