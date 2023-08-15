import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { OpenAIApi } from "openai-edge"
import { ValuesCardData } from "~/lib/consts"

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

  private toEmbeddingString(card: ValuesCard | CanonicalValuesCard) {
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

  async embedCandidate(card: ValuesCardData): Promise<number[]> {
    const syntheticCard = {
      instructionsShort: card.instructions_short,
      instructionsDetailed: card.instructions_detailed,
      evaluationCriteria: card.evaluation_criteria ?? [],
    } as ValuesCard

    const input = this.toEmbeddingString(syntheticCard)
    return this.embed(input)
  }
}
