import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { Configuration, OpenAIApi } from "openai-edge"
import { db, inngest } from "~/config.server"
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
      "### Title" +
      card.title +
      "\n" +
      "### Short Instruction" +
      "\n" +
      card.instructionsShort +
      "\n" +
      "### Long Instruction" +
      "\n" +
      card.instructionsDetailed +
      "\n" +
      "# ChatGPT will be considered successful if, in dialogue with the user, the following kinds of things were surfaced or enabled:" +
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
    const service = new EmbeddingService(db, openai)

    const canonicalCards = (await step.run(
      "Fetching canonical cards",
      async () => service.getCanonicalCardsWithoutEmbedding()
    )) as any as CanonicalValuesCard[]

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
