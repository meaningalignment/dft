import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { OpenAIApi } from "openai-edge"
import { embeddingToSql } from "~/utils"

export default class DeduplicationService {
  private openai: OpenAIApi
  private db: PrismaClient

  constructor(db: PrismaClient, openai: OpenAIApi) {
    this.openai = openai
    this.db = db
  }

  async embedCard(card: CanonicalValuesCard) {
    // Convert card into string.
    const input =
      "short instruction: " +
      card.instructionsShort +
      "\n" +
      "long instruction: " +
      card.instructionsDetailed +
      "\n" +
      "In order to evaluate whether or not ChatGPT is following this value, it could look for: " +
      card.evaluationCriteria.join("\n")

    console.log("Formatted card: ", input)

    // Create embedding for string.
    const res = await this.openai.createEmbedding({
      model: "text-embedding-ada-002",
      input,
    })
    const body = await res.json()
    const embedding = embeddingToSql(body.data[0].embedding)

    console.log("Embedding: ", embedding)

    // Update in DB.
    await this.db
      .$executeRaw`UPDATE "CanonicalValuesCard" SET embedding = ${embedding}::vector WHERE id = ${card.id};`
  }
}
