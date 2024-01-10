import { DeduplicatedCard, ValuesCard } from "@prisma/client"
import { embeddingService as embeddings } from "./embedding"
import { ChatCompletionFunctions } from "openai-edge"
import { db, inngest, openai } from "~/config.server"
import { attentionPoliciesCriteria } from "./prompt-segments"

export const generation = 2
const model = "gpt-4-1106-preview"

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

const clusterPrompt = `You will receive a list of values cards. Group them into clusters, where each cluster is about a value that is shared between the cards.

First, generate a short motivation for why the cards in the cluster are all about the same value.

Then, return a list of integers, where each integer is the id of a values card in the cluster.

Ignore values cards that should not be clustered with any other cards.

${guidelines}`

const dedupePrompt = `You are given a values cards and a list of other canonical values cards. Determine if the value in the input values card is already represented by one of the canonical values. If so, return the id of the canonical values card that represents the source of meaning.

${guidelines}`

const bestValuesCardPrompt = `You will be provided with a list of "values cards", all representing the same value. Your task is to return the "id" of the "values card" which has the best attention policies, according to the guidelines below.

# Card Guidelines
${attentionPoliciesCriteria}`

//
// Functions.
//

const bestCardFunction: ChatCompletionFunctions = {
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

const dedupeFunction: ChatCompletionFunctions = {
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

const clusterFunction: ChatCompletionFunctions = {
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

function toDataModelArrayWithId(
  cards: ValuesCard[] | DeduplicatedCard[]
) {
  return cards.map(card => ({ id: card.id, attentionPolicies: card.evaluationCriteria }))
}

function toDataModelArrayWithIdJSON(
  cards: { id: number, evaluationCriteria: string[] }[]
): string {
  return JSON.stringify(cards.map(card => ({ id: card.id, attentionPolicies: card.evaluationCriteria })))
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
        instructionsDetailed: data.instructionsDetailed,
        evaluationCriteria: data.evaluationCriteria,
      },
    })
    // Embed the canonical values card.
    await embeddings.embedDeduplicatedCard(canonical)
    return canonical
  }

  /**
   * Deduplicate a set of values cards using a prompt.
   */
  async cluster(cards: { id: number, evaluationCriteria: string[] }[]) {
    if (cards.length === 1) {
      return [[cards[0]]]
    }

    const message = toDataModelArrayWithIdJSON(cards)

    console.log(`Calling big daddy GPT with ${message}`)

    // Call prompt.
    const response = await openai.createChatCompletion({
      model,
      messages: [
        { role: "system", content: clusterPrompt },
        { role: "user", content: message },
      ],
      function_call: { name: clusterFunction.name },
      functions: [clusterFunction],
      temperature: 0.0,
    })
    const data = await response.json()

    console.log(`Got response from GPT: ${JSON.stringify(data)}`)

    const clusters = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).clusters as { motivation: string; values_cards_ids: number[] }[]

    for (const cluster of clusters) {
      console.log(
        `Clustered ${cluster.values_cards_ids}. Motivation: ${cluster.motivation}`
      )
    }

    return clusters
  }

  /**
   * Get the best values card according to a prompt from a cluster of cards.
   */
  async getBestValuesCard(
    cards: { id: number, evaluationCriteria: string[] }[]
  ) {
    if (cards.length === 1) return cards[0]

    const message = toDataModelArrayWithIdJSON(cards)

    const response = await openai.createChatCompletion({
      model,
      messages: [
        { role: "system", content: bestValuesCardPrompt },
        { role: "user", content: message },
      ],
      functions: [bestCardFunction],
      function_call: { name: bestCardFunction.name },
      temperature: 0.0,
    })
    const data = await response.json()
    const id: number = JSON.parse(
      data.choices[0].message.function_call.arguments
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
    console.log(`Fetching similar canonical card, candidate: ${JSON.stringify(candidate)}`)

    // Embed the candidate.
    const card_embeddings = await embeddings.embedCandidate(candidate)

    console.log("Got card embeddings, fetching canonical card.")

    // Fetch `limit` canonical cards for the case based on similarity.
    const deduplicated = await this.similaritySearch(card_embeddings, limit, 0.1)

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

    const response = await openai.createChatCompletion({
      model,
      messages: [
        { role: "system", content: dedupePrompt },
        { role: "user", content: message },
      ],
      functions: [dedupeFunction],
      function_call: { name: dedupeFunction.name },
      temperature: 0.0,
    })
    const data = await response.json()
    const matchingId: number | null | undefined = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).canonical_card_id

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

export const seedGeneration = inngest.createFunction({
  name: "Seed a dedupe generation"
}, {
  event: "seed_generation"
}, async ({ step, logger }) => {
  // grab all the values in the db
  const cards = (await step.run(
    `Get all v cards from database`,
    async () => db.valuesCard.findMany({
      select: {
        id: true,
        evaluationCriteria: true,
      }
    })
  )) as { id: number, evaluationCriteria: string[] }[]

  // cluster them ALL mf (currently with prompt - maybe eventually use )
  const clusters = (await step.run(`Cluster cards using prompt`, async () =>
    service.cluster(cards)
  )) as { motivation: string; values_cards_ids: number[] }[]

  logger.info(`Found ${clusters.length} clusters.`)

  // for each cluster, find the best
  let i = 0
  for (const cluster of clusters) {
    if (cluster.values_cards_ids.length < 2) {
      logger.info(`Skipping cluster ${++i} of ${cluster.values_cards_ids.length} cards.`)
    } else {
      logger.info(`Choosing representative from cluster ${++i} of ${cluster.values_cards_ids.length} cards.`)

      const representative = (await step.run(
        "Get best values card from cluster",
        async () => {
          const clusterCards = cluster.values_cards_ids.map(id => cards.find(c => c.id === id)!)
          return service.getBestValuesCard(clusterCards)
        }
      )) as { id: number, evaluationCriteria: string[] }

      console.log(`Representative: ${JSON.stringify(representative)}`);

      (await step.run(
        "Add representative to deduped generation, and embed",
        async () => {
          const fullCard = await db.valuesCard.findFirstOrThrow({
            where: {
              id: representative.id,
            },
          })
          await service.createDeduplicatedCard(fullCard)
        }
      )) as any as DeduplicatedCard
    }
  }
})

export const deduplicate = inngest.createFunction(
  { name: "Deduplicate 2", concurrency: 1 }, // Run sequentially to avoid RCs.
  // { event: "dedupe2" },
  { cron: "0 * * * *" },
  async ({ step, logger }) => {
    logger.info(`Running deduplication.`)

    // Get all non-canonicalized submitted values cards.
    const cards = (await step.run(
      `Get non-canonicalized cards from database`,
      async () => {
        return await db.valuesCard.findMany({
          where: {
            deduplications: { none: { generation } },
            quality: 'ok',
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
              }
            })
          }
        )
      } else {
        const newCanonicalDuplicate = (await step.run(
          `Upgrading card ${card.id} to be a deduplicated card itself`,
          async () => service.createDeduplicatedCard(card)
        )) as any as DeduplicatedCard

        await step.run(
          "Link card to its godlike version",
          async () => {
            await db.deduplication.create({
              data: {
                generation,
                deduplicatedCardId: newCanonicalDuplicate.id,
                valuesCardId: card.id,
              }
            })
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