import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { db } from "../config.server"
import { ChatCompletionFunctions, OpenAI } from "openai"
import { v4 as uuid } from "uuid"
import { embeddingService as embedding } from "../values-tools/embedding"

export type Draw = {
  id: string
  values: Array<CanonicalValuesCard>
}

const getPredictionPrompt = (
  valuesString: string
) => `You are a 'values card' voting predictor. Your task is to determine which values a user is likely to think are wise, given one value provided by them. A 'values card' is a representation of a value. A values card has a numeric id, a title and an instruction for how to guide AI systems in respnoding based on the value.

### Values
${valuesString}

### Output
You always return a list of 6 numbers. Each number is the id of a values card the user is likely to consider as wise.`

const submitWiseValues: ChatCompletionFunctions = {
  name: "submit_wise_values",
  description:
    "Submit 6 ids to values that the user is likely to think are wise.",
  parameters: {
    type: "object",
    properties: {
      six_best_values: {
        type: "array",
        description:
          "The ids of the 6 values that the user is likely to think are wise.",
        items: {
          type: "integer",
          description: "The id of a values card.",
        },
      },
    },
    required: ["six_best_values"],
  },
}

export default class SelectionService {
  private db: PrismaClient
  private openai: OpenAI

  constructor(openai: OpenAI, db: PrismaClient) {
    this.openai = openai
    this.db = db
  }

  async fetchHottestValues(
    userId: number,
    caseId: string,
    limit = 12
  ): Promise<CanonicalValuesCard[]> {
    const cards = (await db.canonicalValuesCard.findMany({
      include: {
        Vote: true,
        Impression: true,
      },
      where: {
        Vote: {
          none: {
            userId,
          },
        },
        Impression: {
          none: {
            userId,
          },
        },
        OR: [
          {
            valuesCards: {
              some: {
                chat: {
                  caseId,
                },
              },
            },
          },
          {
            valuesCards: { none: {} },
          },
        ],
      },
    })) as Array<
      CanonicalValuesCard & {
        hotness?: number
        Vote: { id: number }[]
        Impression: { id: number }[]
      }
    >

    // Process the data to calculate hotness (votes per impression).
    cards.forEach((card) => {
      card.hotness =
        card.Impression.length === 0
          ? 0
          : card.Vote.length / card.Impression.length
    })

    // Sort the cards based on hotness.
    cards.sort((a, b) => b.hotness! - a.hotness!)

    return cards.slice(0, limit)
  }

  async fetchNewestValues(
    userId: number,
    caseId: string,
    limit = 12
  ): Promise<CanonicalValuesCard[]> {
    return (await db.canonicalValuesCard.findMany({
      where: {
        Vote: {
          none: {
            userId,
          },
        },
        Impression: {
          none: {
            userId,
          },
        },
        valuesCards: {
          some: {
            chat: {
              caseId,
            },
          },
        },
      },
      orderBy: [
        {
          Impression: {
            _count: "asc",
          },
        },
        {
          createdAt: "desc",
        },
      ],
      take: limit,
    })) as CanonicalValuesCard[]
  }

  async trimCandidatesWithEmbedding(
    userId: number,
    candidates: CanonicalValuesCard[]
  ): Promise<CanonicalValuesCard[]> {
    console.log(`Trimming candidates with embedding for user ${userId}.`)

    const userEmbedding = await embedding.getUserEmbedding(userId)

    console.log("Got average embedding for user.")

    return await embedding.findValuesSimilarTo(userEmbedding, candidates, 6)
  }

  async trimCandidatesWithPrompt(
    candidates: CanonicalValuesCard[]
  ): Promise<CanonicalValuesCard[]> {
    console.log(`Trimming candidates with prompt`)

    const userValue = (await this.db.valuesCard.findFirst()) as ValuesCard
    const userValueString = JSON.stringify({
      id: userValue.id,
      title: userValue.title,
      instructions: userValue.instructionsShort,
    })

    const valuesString = JSON.stringify(
      candidates.map((c) => {
        return {
          id: c.id,
          title: c.title,
          instructions: c.instructionsShort,
        }
      })
    )

    const system = getPredictionPrompt(valuesString)
    const message = `For a user that has this value:\n\n${userValueString}\n\nWhich 6 of the provided values is he or she most likely to think is also wise to consider?`

    // Call prompt.
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      function_call: { name: submitWiseValues.name },
      functions: [submitWiseValues],
    })
    const data = await response.json()
    const ids = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).six_best_values

    return candidates.filter((c) => ids.includes(c.id))
  }

  /**
   * Generate a draw for the user with id `userId`.
   */
  async getDraw(userId: number, caseId: string): Promise<Draw> {
    console.log(`Getting draw for user ${userId} in case ${caseId}.`)

    // Get canidates.
    const candidates = await Promise.all([
      this.fetchNewestValues(userId, caseId, 12),
      this.fetchHottestValues(userId, caseId, 12),
    ]).then((r) => [...r[0], ...r[1]])

    // Remove duplicates.
    const candidatesUnique = candidates.filter(
      (c, i) => candidates.findIndex((c2) => c2.id === c.id) === i
    )

    console.log(`Found ${candidatesUnique.length} candidates.`)

    // Trim unique candidates.
    let values: CanonicalValuesCard[] = []
    if (candidatesUnique.length === 0) {
      return { id: uuid(), values }
    } else if (process.env.SELECT_ROUTING_USE_PROMPT === "true") {
      values = await this.trimCandidatesWithPrompt(candidatesUnique)
    } else {
      values = await this.trimCandidatesWithEmbedding(userId, candidatesUnique)
    }

    // Return draw with trimmed candidates.
    return { id: uuid(), values }
  }
}
