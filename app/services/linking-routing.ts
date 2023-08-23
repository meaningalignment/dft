import {
  CanonicalValuesCard,
  Edge,
  EdgeHypothesis,
  PrismaClient,
  ValuesCard,
  Vote,
} from "@prisma/client"
import { db, inngest } from "~/config.server"
import { ChatCompletionFunctions, Configuration, OpenAIApi } from "openai-edge"
import { splitToPairs } from "~/utils"
import EmbeddingService from "./embedding"
import DeduplicationService from "./deduplication"
import { model } from "~/lib/consts"
import { Logger } from "inngest/middleware/logger"

type EdgesHypothesis = {
  to: CanonicalValuesCard
  from: CanonicalValuesCard[]
}

// type ValuesPair = [CanonicalValuesCard, CanonicalValuesCard]

// TODO - hardcoded for now. Should have a background job that generates these hypotheses.
// Will revise after deciding what to do about this screen?
// const hypotheses: LinkHypothesis[] = [
//   { moreComprehensive: 50, lessComprehensive: 59 },
//   { moreComprehensive: 52, lessComprehensive: 67 },
//   { moreComprehensive: 56, lessComprehensive: 68 },
//   { moreComprehensive: 53, lessComprehensive: 62 },
//   { moreComprehensive: 70, lessComprehensive: 59 },
// ]

const prompt = `You are a 'values card' linking assistant. Given a list of values cards, you find two values that seem to be more/less comprehensive versions of each other.

# Values Card
A "values card" is a representation of a "source of meaning". A values card has five fields: "id", "title", "instructions_short", "instructions_detailed", and "evaluation_criteria".

# What Is Meant By 'More Comprehensive'?
We mean 'more comprehsive' as used by Ruth Chang – that is, certain values obviate the need for others, since all of the important parts of the value is included in the more comprehensive one. If one was to make a choice, it would be enough to only consider the more comprehensive one.

Another way of framing this would be that more comprehensive values resolve some tension between two or more other values. They allow us to make 'all things considered' judgements between two or more values that seem incommensurable.all

# Examples

## Less Comprehensive Values:

### A:
{"title": "Helicopter Parent", "instructions": "ChatGPT should help me be there sensibly for my child."}

### B:
{"title": "Tough Love", "instructions": "ChatGPT should encourage resilience and independence in my child."}

## More Comprehensive Value:

{"title": "Fostering Resilience", "instructions": "ChatGPT should help my child face emotional turmoil independently and provide support when needed."}

## Less Comprehensive Values:

### A:
{"title": "Shortest Path", "instructions": "ChatGPT should strive to find the most efficient and least risky solution."}

### B:
{"title": "Open-Endedness", "instructions": "ChatGPT should allow for chance and serendipitous outcomes."}

## More Comprehensive Value:
{"title": "Portfolio Approach", "instructions": "ChatGPT should promote a balance of tried-and-true methods with exploratory actions."}

# Output
You will receive a list of values cards. Your output should be the a list of id pairs, where the id of each pair refer to a values card that seem to be a more/less comprehensible version of the other value in the pair.`

const submitValueLinks: ChatCompletionFunctions = {
  name: "submit_value_links",
  description:
    "Submit value card ids that seem to be more & less comprehensive versions of the same value.",
  parameters: {
    type: "object",
    properties: {
      links: {
        type: "array",
        description:
          "Groups of value card ids that seem to be more & less comprehensive versions of each other.",
        items: {
          type: "object",
          properties: {
            less_comprehensive_values: {
              type: "array",
              description:
                "One or more value card ids that is the less comprehensive version of the more comprehensive value.",
              items: {
                type: "number",
                description:
                  "The id of one of the values that are the less comprehensive versions of the more comprehensive value.",
              },
            },
            more_comprehensive_value: {
              type: "number",
              description:
                "The id of the value that is the more comprehensive version of the less comprehensive values.",
            },
          },
        },
      },
    },
    required: ["links"],
  },
}

export default class LinkRoutingService {
  private db: PrismaClient
  private openai: OpenAIApi
  private embedding: EmbeddingService

  constructor(
    openai: OpenAIApi,
    db: PrismaClient,
    embedding: EmbeddingService
  ) {
    this.openai = openai
    this.db = db
    this.embedding = embedding
  }

  async createHypotheticalEdges(cards: CanonicalValuesCard[]): Promise<
    {
      to: CanonicalValuesCard
      from: CanonicalValuesCard[]
    }[]
  > {
    // Create a message with the cards for the prompt.
    const message = JSON.stringify(
      cards.map((c) => {
        return {
          id: c.id,
          instructions: c.instructionsShort,
        }
      })
    )

    // Get the hypothetical edges from the prompt.
    const response = await this.openai.createChatCompletion({
      model, // This is probably one of our longest prompts & message combination – might want to use the 32k model eventually.
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message },
      ],
      functions: [submitValueLinks],
      function_call: { name: submitValueLinks.name },
    })
    const data = await response.json()

    const links = JSON.parse(data.choices[0].message.function_call.arguments)
      .links as {
      more_comprehensive_value: number
      less_comprehensive_values: number[]
    }[]

    // Return the edges with the corresponding cards.
    return links.map((l) => {
      const to = cards.find(
        (c) => c.id === l.more_comprehensive_value
      ) as CanonicalValuesCard
      const from = cards.filter((c) =>
        l.less_comprehensive_values.includes(c.id)
      ) as CanonicalValuesCard[]

      return { to, from }
    })
  }

  async addHypotheticalEdge(
    fromId: number,
    toId: number,
    logger: Logger
  ): Promise<void> {
    const count = await db.edgeHypothesis.count({
      where: { fromId, toId },
    })

    if (count !== 0) {
      logger.info(`Edge between ${fromId} and ${toId} already exists.`)
      return
    }

    logger.info(`Creating edge between ${fromId} and ${toId}.`)

    await db.edgeHypothesis.create({
      data: {
        from: { connect: { id: fromId } },
        to: { connect: { id: toId } },
      },
    })
  }

  private async orderedByThematicRelevance(
    userId: number,
    values: CanonicalValuesCard[]
  ): Promise<Array<CanonicalValuesCard>> {
    // Get the user's embedding.
    const user = await this.embedding.getUserEmbedding(userId)

    // Get the values ordered by their similarity to the user's embedding.
    const result = await this.db.$queryRaw<
      Array<CanonicalValuesCard & { _distance: number }>
    >`
    SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> ${JSON.stringify(
      user
    )}::vector as "_distance" 
    FROM "CanonicalValuesCard" cvc
    WHERE cvc.id IN (${values.map((v) => v.id)})
    ORDER BY "_distance" ASC;`

    return result
  }

  async getDraw(userId: number, size: number = 5): Promise<EdgesHypothesis[]> {
    // Find edge hypotheses that the user has not linked together yet.
    const candidates = await this.db.edgeHypothesis.findMany({
      where: {
        AND: [
          { from: { edgesTo: { none: { userId } } } },
          { to: { edgesFrom: { none: { userId } } } },
        ],
      },
      include: {
        from: true,
        to: true,
      },
    })

    const fromValues = candidates.map((c) => c.from as CanonicalValuesCard)
    const toValues = candidates.map((c) => c.to as CanonicalValuesCard)

    //
    // Sort the value hypotheses by two metrics:
    //  1. How similar they are thematically to the values submitted by the user.
    //  2. If the user has selected one of the values as being "wise to consider".
    //
    // This should give us relevant values for the user that are "at the edge
    // of their wisdom".
    //

    // Values that the user thinks are "wise to consider".
    const votes = (await this.db.vote.findMany({
      where: {
        userId,
        valuesCardId: { in: fromValues.map((c) => c.id) },
      },
    })) as Vote[]

    // 1., sort the "more comprehensive" values thematically.
    const sortedThematically = await this.orderedByThematicRelevance(
      userId,
      toValues
    )

    // 2., Sort the sorted values again by wether or not the user has voted for them.
    const sorted: CanonicalValuesCard[] = sortedThematically
      .sort((a: CanonicalValuesCard, b: CanonicalValuesCard) => {
        const voteA = votes.find((v) => v.valuesCardId === a.id)
        const voteB = votes.find((v) => v.valuesCardId === b.id)

        // If the user has voted for one of the values, it should be prioritized.
        if (voteA && !voteB) {
          return -1
        } else if (!voteA && voteB) {
          return 1
        }

        // If both or neither has been voted for, sort by the semantic similarity alone.
        return 0
      })
      .slice(0, size)

    //
    // Return a draw of the most relevant "more comprehensive" values,
    // and all the "less comprehensive" values that are linked to each of them.
    //
    const draw = sorted.map((c) => {
      return {
        to: c,
        from: candidates
          .filter((h) => h.toId === c.id)
          .map((h) => h.from as CanonicalValuesCard),
      }
    })

    return draw
  }
}

//
// Ingest function for creating edge hypotheses.
//

export const hypothesize = inngest.createFunction(
  { name: "Create Hypothetical Edges" },
  { cron: process.env.EDGE_HYPOTHESIS_CRON ?? "0 */12 * * *" },
  async ({ step, logger }) => {
    logger.info("Running hypothetical links generation...")

    //
    // Prepare the service.
    //
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)
    const embedding = new EmbeddingService(openai, db)
    const service = new LinkRoutingService(openai, db, embedding)

    //
    // Get all the canonical cards.
    //
    const cards = (await step.run(
      "Get canonical cards from database",
      async () => db.canonicalValuesCard.findMany()
    )) as any as CanonicalValuesCard[]

    if (cards.length === 0) {
      return {
        message: "No canonical cards exist.",
      }
    }

    logger.info(`Found ${cards.length} canonical cards.`)

    //
    // Create the hypothetical edges using a prompt.
    //
    const edgeHypotheses = (await step.run(
      "Create hypothetical edges",
      async () => service.createHypotheticalEdges(cards)
    )) as any as {
      to: CanonicalValuesCard
      from: CanonicalValuesCard[]
    }[]

    logger.info(`Created ${edgeHypotheses.length} edge hyptheses.`)

    //
    // Insert the edges into the database.
    //
    const operations = (await step.run(
      "Add hypothetical edges in db",
      async () => {
        let promises: Promise<void>[] = []

        for (const edge of edgeHypotheses) {
          for (const from of edge.from) {
            promises.push(
              service.addHypotheticalEdge(from.id, edge.to.id, logger)
            )
          }
        }

        await Promise.all(promises)

        return promises.length
      }
    )) as number

    const message = `Upserted ${operations} edges.`
    logger.info(message)

    return { message }
  }
)
