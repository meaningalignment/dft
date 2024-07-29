import { DeduplicatedCard, ValuesCard } from "@prisma/client"
import { embeddingService as embeddings } from "./embedding"
import { db, inngest, openai } from "~/config.server"
import { attentionPoliciesCriteria } from "./prompt-segments"
import { DBSCAN } from "density-clustering"

const model = "gpt-4-turbo"

const generation = 3

//
// Prompts.
//

const guidelines = `# Guidelines
Two or more values cards are about the same value if:
- A user that articulated one of the cards would feel like the other cards in the cluster capture what they cared about *fully*.
- Someone instructed to pay attention to one set of attention policies would pay attention to exactly the same things as someone instructed to pay attention to the other set.
- Any difference in attention policies between the cards would be acknowledged as an oversight or a mistake, and both cards should be updated to reflect the same attention policies.
- The cards are formulated using roughly the same level of granularity and detail.

Only if the cards pass all of these criteria can they be considered to be about the same value.`

const dedupePrompt = `You are given a values cards and a list of other canonical values cards. Determine if the value in the input values card is already represented by one of the canonical values. If so, return the id of the canonical values card that represents the source of meaning.

${guidelines}`

const bestValuesCardPrompt = `You will be provided with a list of "values cards", all representing the same value. Your task is to return the "id" of the "values card" which has the best attention policies, according to the guidelines below.

# Card Guidelines
${attentionPoliciesCriteria}`

//
// Functions.
//

const bestCardFunction = {
  name: "best_card",
  description:
    "Return the best formulated values card from a list of values cards.",
  parameters: {
    type: "object",
    properties: {
      best_values_card_id: {
        type: "integer",
        description:
          "The id of the values card that is best formulated according to the guidelines.",
      },
    },
    required: ["best_values_card_id"],
  },
}

const dedupeFunction = {
  name: "dedupe",
  description:
    "Return the id of the canonical values card that is a duplicate value ",
  parameters: {
    type: "object",
    properties: {
      canonical_card_id: {
        type: "number",
        description:
          "The id of the canonical values card that is about the same source of meaning as the provided non-canonical values card. Should only be included if such a card exists.",
      },
    },
  },
}

const clusterFunction = {
  name: "cluster",
  description:
    "Return a list of clusters, where each cluster is a list of values card ids that all are about the same value.",
  parameters: {
    type: "object",
    properties: {
      clusters: {
        type: "array",
        description:
          "A list of clusters, where each cluster is a list of values card ids that are about the same value.",
        items: {
          type: "object",
          description: "A cluster of values card ids.",
          properties: {
            motivation: {
              type: "string",
              description:
                "A short motivation text for *why* the cards in the cluster are all about the same value. Should not be longer than a short sentence or two.",
            },
            values_cards_ids: {
              type: "array",
              description:
                "A list of values card ids that all share the same value.",
              items: {
                type: "integer",
                description: "A values card id.",
              },
            },
          },
        },
      },
    },
    required: ["clusters"],
  },
}

function toDataModelArrayWithId(cards: ValuesCard[] | DeduplicatedCard[]) {
  return cards.map((card) => ({
    id: card.id,
    attentionPolicies: card.evaluationCriteria,
  }))
}

function toDataModelArrayWithIdJSON(
  cards: { id: number; evaluationCriteria: string[] }[]
): string {
  return JSON.stringify(
    cards.map((card) => ({
      id: card.id,
      attentionPolicies: card.evaluationCriteria,
    }))
  )
}

export function cosineDistance(vecA: number[], vecB: number[]) {
  let dotProduct = 0.0
  let normA = 0.0
  let normB = 0.0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  return 1.0 - dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// DBSCAN instance
let dbscan = new DBSCAN()

export interface ClusterableObject {
  id: number
  embedding: number[]
}
export function cluster<X extends ClusterableObject>(
  objs: X[],
  { epsilon = 0.11, minPoints = 3 }: { epsilon: number; minPoints: number } = {
    epsilon: 0.11,
    minPoints: 3,
  }
) {
  // Epsilon (maximum radius) and minimum points
  // let epsilon = 0.11; // Adjust this based on your needs
  // let minPoints = 3;

  // Run DBSCAN with cosine distance
  let clusters = dbscan
    .run(
      objs.map((c) => c.embedding),
      epsilon,
      minPoints,
      cosineDistance
    )
    .map((cluster) => cluster.map((i) => objs[i]))

  // clusters now contains your clustered vectors
  console.log(`Found ${clusters.length} clusters.`)
  console.log({ clusters })
  return clusters
}

/**
 * Handles all logic around deduplicating and canonicalizing values cards.
 */
export default class DeduplicationService {
  /**
   * Create an entry in `DeduplicatedCard`.
   */
  async createDeduplicatedCard(data: ValuesCard) {
    // Create a canonical values card.
    const canonical = await db.deduplicatedCard.create({
      data: {
        generation,
        title: data.title,
        instructionsShort: data.instructionsShort,
        instructionsDetailed: data.instructionsDetailed!,
        evaluationCriteria: data.evaluationCriteria,
      },
    })
    // Embed the canonical values card.
    await embeddings.embedDeduplicatedCard(canonical)
    return canonical
  }

  /**
   * Get the best values card according to a prompt from a cluster of cards.
   */
  async getBestValuesCard(card_ids: number[]) {
    const cards = await db.valuesCard.findMany({
      where: {
        id: { in: card_ids },
      },
    })
    if (cards.length === 1) return cards[0]

    const message = toDataModelArrayWithIdJSON(cards)

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: bestValuesCardPrompt },
        { role: "user", content: message },
      ],
      functions: [bestCardFunction],
      function_call: { name: bestCardFunction.name },
      temperature: 0.0,
    })
    const id: number = JSON.parse(
      response.choices[0]!.message.tool_calls![0].function!.arguments
    ).best_values_card_id

    const card = cards.find((c) => c.id === id)!

    return card
  }

  async similaritySearch(
    vector: number[],
    limit: number = 20,
    minimumDistance: number = 0.13
  ): Promise<Array<DeduplicatedCard>> {
    const query = `SELECT DISTINCT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> '${JSON.stringify(
      vector
    )}'::vector as "_distance"
    FROM "DeduplicatedCard" cvc
    WHERE "generation" = ${generation}
    ORDER BY "_distance" ASC
    LIMIT ${limit};`

    const result = await db.$queryRawUnsafe<
      Array<DeduplicatedCard & { _distance: number }>
    >(query)

    return result.filter((r) => r._distance < minimumDistance)
  }

  /**
   * If a canonical values card exist that is essentially the same value as the provided candidate, return it.
   * Otherwise, return null.
   */
  async fetchSimilarDeduplicatedCard(
    candidate: { evaluationCriteria: string[] },
    limit: number = 5
  ): Promise<DeduplicatedCard | null> {
    console.log(
      `Fetching similar canonical card, candidate: ${JSON.stringify(candidate)}`
    )

    // Embed the candidate.
    const card_embeddings = await embeddings.embedCandidate(candidate)

    console.log("Got card embeddings, fetching canonical card.")

    // Fetch `limit` canonical cards for the case based on similarity.
    const deduplicated = await this.similaritySearch(
      card_embeddings,
      limit,
      0.1
    )

    console.log(`Got ${deduplicated.length} deduplicated cards`)

    // If we have no canonical cards, we can't deduplicate.
    if (deduplicated.length === 0) {
      console.log("No deduplicated cards found for candidate.")
      return null
    }

    //
    // Use a prompt to see if any of the deduplicated cards are the same value
    //
    const message = JSON.stringify({
      input_values_card: candidate,
      canonical_values_cards: toDataModelArrayWithId(deduplicated),
    })

    console.log("Calling prompt for deduplication.")

    const response = (await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: dedupePrompt },
        { role: "user", content: message },
      ],
      functions: [dedupeFunction],
      function_call: { name: dedupeFunction.name },
      temperature: 0.0,
    }))!
    const matchingId: number | null | undefined = JSON.parse(
      response.choices[0].message.tool_calls![0].function.arguments
    ).canonical_card_id!

    console.log(`Got response from prompt, deduplicated: ${matchingId}`)

    // Return the matching canonical card, or null if no such card exists.
    return deduplicated.find((c) => c.id === matchingId) ?? null
  }
}

//
// Ingest function for deduplication.
//
// Type casting is a bit broken here, hence the `any` casts.
// Thread with caution.
//

const service = new DeduplicationService()

export const seedGeneration = inngest.createFunction(
  {
    name: "Seed a dedupe generation",
  },
  {
    event: "seed_generation",
  },
  async ({ step, logger }) => {
    // cluster them ALL mf (currently with prompt - maybe eventually use )
    const clusters = await step.run(
      `Clustering, using badass linear algebra`,
      async () => {
        const cards = await db.$queryRawUnsafe<Array<ClusterableObject>>(
          `SELECT id, embedding::real[] FROM "ValuesCard"`
        )
        return cluster(cards).map((cluster) => cluster.map((c) => c.id))
      }
    )

    logger.info(`Found ${clusters.length} clusters.`)

    // for each cluster, find the best
    let i = 0
    for (const cluster of clusters) {
      if (cluster.length < 2) {
        logger.info(`Skipping cluster ${++i} of ${cluster.length} cards.`)
      } else {
        logger.info(
          `Choosing representative from cluster ${++i} of ${
            cluster.length
          } cards.`
        )

        const representative = (await step.run(
          `Get best values card from cluster ${i} of ${cluster.length} cards.`,
          async () => service.getBestValuesCard(cluster)
        )) as any as ValuesCard

        console.log(`Representative: ${JSON.stringify(representative)}`)
        ;(await step.run(
          "Add representative to deduped generation, and embed",
          async () => service.createDeduplicatedCard(representative)
        )) as any as DeduplicatedCard
      }
    }
  }
)

export const deduplicate = inngest.createFunction(
  { name: "Deduplicate 2", concurrency: 1 }, // Run sequentially to avoid RCs.
  { event: "dedupe2" },
  // { cron: "0 * * * *" },
  async ({ step, logger }) => {
    logger.info(`Running deduplication.`)

    // Get all non-canonicalized submitted values cards.
    const cards = (await step.run(
      `Get non-canonicalized cards from database`,
      async () => {
        return await db.valuesCard.findMany({
          where: {
            deduplications: { none: { generation } },
          },
          take: 100,
        })
      }
    )) as any as ValuesCard[]

    if (cards.length === 0) {
      logger.info(`No cards to deduplicate.`)

      return {
        message: `No cards to deduplicate.`,
      }
    }

    //
    // For each deduplicated non-canonical card, find canonical cards that are essentially
    // the same value and link them.
    //
    // If no such cards exist, canonicalize the duplicated non-canonical card and link the cluster
    // to the new canonical card.
    //
    let i = 0
    for (const card of cards) {
      logger.info(`Deduplicating new card ${card.id}.`)

      const existingCanonicalDuplicate = (await step.run(
        "Fetch canonical duplicate",
        async () => service.fetchSimilarDeduplicatedCard(card)
      )) as any as DeduplicatedCard | null

      if (existingCanonicalDuplicate) {
        await step.run(
          `Linking card ${card.id} to existing canonical card ${existingCanonicalDuplicate.id}`,
          async () => {
            await db.deduplication.create({
              data: {
                generation,
                deduplicatedCardId: existingCanonicalDuplicate.id,
                valuesCardId: card.id,
              },
            })
          }
        )
      } else {
        await step.run(
          `Upgrading card ${card.id} to be a deduplicated card itself`,
          async () => {
            const canonical = await db.deduplicatedCard.create({
              data: {
                generation,
                title: card.title,
                instructionsShort: card.instructionsShort,
                instructionsDetailed: card.instructionsDetailed!,
                evaluationCriteria: card.evaluationCriteria,
                deduplications: {
                  create: {
                    generation,
                    valuesCardId: card.id,
                  },
                },
              },
            })
            // Embed the canonical values card.
            await embeddings.embedDeduplicatedCard(canonical)
          }
        )
      }
    }

    logger.info(`Done. Deduplicated ${cards.length} cards.`)

    return {
      message: `Deduplicated ${cards.length} cards.`,
    }
  }
)
