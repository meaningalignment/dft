import { PrismaClient } from "@prisma/client"
import { db } from "../config.server"

class SelectionRoutingService {
  private db: PrismaClient

  constructor(db: PrismaClient) {
    this.db = db
  }

  async getValues(userId: string) {
    // Get candidate values.
    const candidates = await this.db.canonicalValuesCard.findMany({
      take: 100,
    })

    // Get the 30 values furthest away from the user's current values.
    // Sort on diversity (meaning we get the 30 most diverse values).

    // Get 6 random values from the 30 candidates.

    // return values
  }
}
