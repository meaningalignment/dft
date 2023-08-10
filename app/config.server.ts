import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { cowpunkify } from "cowpunk-auth"

export const db = new PrismaClient()

export async function setCanonicalCardEmbedding(
  canonicalCardId: number,
  embedding: number[]
): Promise<number> {
  return db.$executeRaw`UPDATE "CanonicalValuesCard" SET embedding = ${JSON.stringify(
    embedding
  )}::vector WHERE id = ${canonicalCardId};`
}

export async function setNonCanonicalCardEmbedding(
  cardId: number,
  embedding: number[]
): Promise<number> {
  return db.$executeRaw`UPDATE "ValuesCard" SET embedding = ${JSON.stringify(
    embedding
  )}::vector WHERE id = ${cardId};`
}

export async function getNonCanonicalCardsWithoutEmbedding(): Promise<
  Array<ValuesCard>
> {
  return (await db.$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria" FROM "CanonicalValuesCard" WHERE "CanonicalValuesCard".embedding IS NULL`) as ValuesCard[]
}

export async function getCanonicalCardsWithoutEmbedding(): Promise<
  Array<CanonicalValuesCard>
> {
  return (await db.$queryRaw`SELECT id, title, "instructionsShort", "instructionsDetailed", "evaluationCriteria", embedding::text FROM "CanonicalValuesCard" WHERE "CanonicalValuesCard".embedding IS NOT NULL`) as CanonicalValuesCard[]
}

export const auth = cowpunkify({
  site: "Democratic Fine-Tuning",
  loginFrom: "Democratic Fine-Tuning <info@meaningalignment.org>",
  users: db.user,
  emailCodes: db.emailCodes,
})
