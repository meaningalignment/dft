import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { OpenAIApi } from "openai-edge"
import EmbeddingService from "./embedding"
import { ValuesCardCandidate } from "~/lib/consts"

const deduplicationPrompt = `

`

/**
 * Handles all logic around deduplicating and canonicalizing values cards.
 */
class DeduplicationService {
  private openai: OpenAIApi
  private db: PrismaClient
  private embeddingService: EmbeddingService

  constructor(
    db: PrismaClient,
    openai: OpenAIApi,
    embedding: EmbeddingService
  ) {
    this.embeddingService = embedding
    this.openai = openai
    this.db = db
  }

  /**
   * If a canonical values card exist that is essentially the same value as the provided candidate, return it.
   * Otherwise, return null.
   */
  async fetchSameCanonicalValue(
    candidate: ValuesCardCandidate,
    limit: number = 3
  ): Promise<CanonicalValuesCard | null> {
    // Embed the candidate.
    const embeddings = await this.embeddingService.embedCandidate(candidate)

    // Fetch `limit` canonical cards based on similarity.
    const canonical = await this.embeddingService.similaritySearch(
      embeddings,
      limit
    )

    // If we have no canonical cards, we can't deduplicate.
    if (canonical.length === 0) {
      return null
    }

    // Use a prompt to see if any of the canonical cards are the same value
    return null
  }

  /**
   * Deduplicate all values cards in the database.
   */
  async cron() {
    // Get all non-canonicalized submitted values cards.
    const cards = (await this.db.valuesCard.findMany({
      where: {
        canonicalCardId: null,
      },
    })) as ValuesCard[]

    if (cards.length === 0) {
      console.log("No cards to deduplicate.")
      return
    }

    // Deduplicate the non-canonicalized cards with a prompt.
    const deduplicated = cards // TODO

    //
    // For each deduplicated non-canonical card, find any canonical cards that are essentially
    // the same value and link them.
    //
    // If no such cards exist, add the duplicated non-canonical card to canonicalized cards.
    //
    for (const card of deduplicated) {
      // Find a canonical card that is essentially the same value.
      let canonical = await this.fetchSameCanonicalValue(card as any)

      // If no canonical card exists, create one.
      if (!canonical) {
        canonical = await this.db.canonicalValuesCard.create({
          data: {
            title: card.title,
            instructionsShort: card.instructionsShort,
            instructionsDetailed: card.instructionsDetailed,
            evaluationCriteria: card.evaluationCriteria,
          },
        })
      }

      // Link the non-canonical card to the canonical card.
      await this.db.valuesCard.update({
        where: {
          id: card.id,
        },
        data: {
          canonicalCardId: canonical.id,
        },
      })
    }
  }
}
