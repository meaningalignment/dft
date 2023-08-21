import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { splitToPairs } from "~/utils"

type LinkHypothesis = {
  moreComprehensive: number
  lessComprehensive: number
}

type ValuesPair = [CanonicalValuesCard, CanonicalValuesCard]

// TODO - hardcoded for now. Should have a background job that generates these hypotheses.
// Will revise after deciding what to do about this screen?
const hypotheses: LinkHypothesis[] = [
  { moreComprehensive: 50, lessComprehensive: 59 },
  { moreComprehensive: 52, lessComprehensive: 67 },
  { moreComprehensive: 56, lessComprehensive: 68 },
  { moreComprehensive: 53, lessComprehensive: 62 },
  { moreComprehensive: 70, lessComprehensive: 59 },
]

export default class LinkRoutingService {
  private db: PrismaClient

  constructor(db: PrismaClient) {
    this.db = db
  }

  async getDraw(userId: number): Promise<ValuesPair[]> {
    const values = (await this.db.canonicalValuesCard.findMany({
      where: {
        id: {
          in: hypotheses
            .map((h) => [h.moreComprehensive, h.lessComprehensive])
            .flat(),
        },
        edgesFrom: { none: { userId } },
        edgesTo: { none: { userId } },
      },
    })) as CanonicalValuesCard[]

    return hypotheses
      .map((h) => {
        const more = values.find((v) => v.id === h.moreComprehensive)
        const less = values.find((v) => v.id === h.lessComprehensive)

        // Randomly swap the order of the pair.
        if (more && less) {
          if (Math.random() > 0.5) {
            return [less, more]
          } else {
            return [more, less]
          }
        }

        // Return null if either value is missing.
        return null
      })
      .filter((v) => v !== null) as ValuesPair[]
  }
}
