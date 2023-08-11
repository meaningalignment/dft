import { CanonicalValuesCard, PrismaClient } from "@prisma/client"
import { db } from "../config.server"
import { calculateAverageEmbedding } from "~/utils"

export default class SelectionRoutingService {
  private db: PrismaClient

  constructor(db: PrismaClient) {
    this.db = db
  }

  /**
   * Generate a draw of `drawSize` for the user with id `userId`.
   */
  async getDraw(
    userId: number,
    drawSize = 6
  ): Promise<Array<CanonicalValuesCard>> {
    // Calculate the average embedding of the user's values.
    const userEmbeddings: Array<Array<number>> = (
      await db.$queryRaw<
        Array<{ embedding: any }>
      >`SELECT embedding::text FROM "ValuesCard" vc INNER JOIN "Chat" c  ON vc."chatId" = c."id" WHERE c."userId" = ${userId} AND vc."embedding" IS NOT NULL`
    ).map((r) => JSON.parse(r.embedding).map((v: any) => parseFloat(v)))
    const userVector = calculateAverageEmbedding(userEmbeddings)

    // Get 30 candidate canonical values furthest away from the user's values semantically,
    // that have not been synthesized from one of the user's values.
    const candidates = await this.db.$queryRaw<Array<CanonicalValuesCard>>`
    SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> ${JSON.stringify(
      userVector
    )}::vector as "_distance" 
    FROM "CanonicalValuesCard" cvc
    INNER JOIN "ValuesCard" vc ON vc."canonicalCardId" = cvc."id"
    INNER JOIN "Chat" c ON vc."chatId" = c."id"
    WHERE c."userId" != ${userId}
    ORDER BY "_distance" DESC
    LIMIT 30;`

    console.log(
      `Got selection candidates for user ${userId}: ${candidates.map(
        (c) => c.id
      )}}`
    )

    // Get a random draw of `drawSize` from the 30 canidates.
    return candidates.sort(() => 0.5 - Math.random()).slice(0, drawSize)
  }
}
