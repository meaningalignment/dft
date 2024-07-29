import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { embeddingService as embeddings } from "../values-tools/embedding"
import { ValuesCardData } from "~/lib/consts"
import { OpenAI } from "openai"
import { toDataModel, toDataModelWithId } from "~/utils"
import { db, inngest, isChatGpt } from "~/config.server"

//
// Prompts.
//

const clusterPrompt = `You will receive a list of values cards. Group them into clusters, where each cluster is about a value that is shared between the cards.

First, generate a short motivation for why the cards in the cluster are all about the same value.

Then, return a list of integers, where each integer is the id of a values card in the cluster.

Ignore values cards that should not be clustered with any other cards.

# Guidelines
In order to determine if two or more values cards are about the same value, use the following criteria:
- Are the evaluation criterias of the cards essentially the same?
- If not, do the cards share at least one evaluation criteria, whilst the other criterias fit together to form a coherent whole?
- Are there *no* evaluation criterias that are entirely different between the cards?
- Are the cards formulated using roughly the same level of granularity and detail?
- Would a user that articulated one of the cards feel like the other cards in the cluster captured what they cared about *fully*?

If the cards pass all of these criteria, and *only* if they pass all of these criteria, can they be considered to be about the same value.`

const dedupePrompt = `You are given a values cards and a list of other canonical values cards. Determine if the value in the input values card is already represented by one of the canonical values. If so, return the id of the canonical values card that represents the source of meaning.

# Guidelines
In order to determine if two or more values cards are about the same value, use the following criteria:
- Are the evaluation criterias of the cards essentially the same?
- If not, do the cards share at least one evaluation criteria, whilst the other criterias fit together to form a coherent whole?
- Are there *no* evaluation criterias that are entirely different between the cards?
- Are the cards formulated using roughly the same level of granularity and detail?
- Would a user that articulated one of the cards feel like the other cards in the cluster captured what they cared about *fully*?

If the cards pass all of these criteria, and *only* if they pass all of these criteria, can they be considered to be about the same value.`

const bestValuesCardPrompt = `You will be provided with a list of "values card", all representing the same value. Your task is to return the "id" of the "values card" that is best formulated according to the guidelines below.

# Card Guidelines
1. **Cards should be indeterminate.** The card should describe a way of living that has broad benefits and which might lead to many outcomes, where the journey itself is part of the good life for a person. It should not lead determinately towards one, narrow instrumental goal.
2. **Cards should not be about meeting others’ expectations.** They should be the kind of thing that is meaningful to someone.
3. **Cards should be positively stated**. The stuff in the “how” section should be things ${
  isChatGpt ? "ChatGPT" : "one"
} SHOULD attend to.
4. **Cards should use clear, simple language**. Anyone in the relevant context should be able to see what you mean about what to attend to. The instructions should be clear enough that you could use them in a survey to see whether or not someone was attending to those things.
5. **Cards should be as general as possible.** Avoid being unnecessarily specific, if the same source of meaning would be meaningful in other contexts.
6. **Cards should not have unnecessary elements.** All elements of the source of meaning should be required, and work together, in the context.
7. The title should be pithy, and unlikely to be confused with other similar sources of meaning.
8. The values card should be written from the perspective of how ${
  isChatGpt ? "ChatGPT" : "one"
}  should respond to the situation in the first message. They should reflect the user's sources of meaning, not yours.`

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

/**
 * Handles all logic around deduplicating and canonicalizing values cards.
 */
export default class DeduplicationService {
  private openai: OpenAI
  private db: PrismaClient

  constructor(openai: OpenAI, db: PrismaClient) {
    this.openai = openai
    this.db = db
  }

  /**
   * Create an entry in `CanonicalValuesCard`.
   */
  async createCanonicalCard(data: ValuesCardData) {
    // Create a canonical values card.
    const canonical = await this.db.canonicalValuesCard.create({
      data: {
        title: data.title,
        instructionsShort: data.instructions_short,
        instructionsDetailed: data.instructions_detailed,
        evaluationCriteria: data.evaluation_criteria,
      },
    })
    // Embed the canonical values card.
    await embeddings.embedDeduplicatedCard(canonical as any)
    return canonical
  }

  /**
   * Deduplicate a set of values cards using a prompt.
   */
  async cluster(cards: ValuesCard[]): Promise<ValuesCard[][]> {
    if (cards.length === 1) {
      return [[cards[0]]]
    }

    const message = JSON.stringify(cards.map((c) => toDataModelWithId(c)))

    // Call prompt.
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: clusterPrompt },
        { role: "user", content: message },
      ],
      function_call: { name: clusterFunction.name },
      functions: [clusterFunction],
      temperature: 0.0,
    })
    const clusters = JSON.parse(
      response.choices[0].message.function_call!.arguments!
    ).clusters

    const uniqueIds = clusters.flatMap((c: any) => c.values_cards_ids)

    for (const cluster of clusters) {
      console.log(
        `Clustered ${cluster.values_cards_ids}. Motivation: ${cluster.motivation}`
      )
    }

    const clusterValues = clusters.map(
      (cluster: { values_cards_ids: number[] }) =>
        cluster.values_cards_ids.map(
          (id: number) => cards.find((c) => c.id === id) as ValuesCard
        )
    )

    const uniqueValues = cards
      .filter((c) => !uniqueIds.includes(c.id))
      .map((c) => [c])

    return [...clusterValues, ...uniqueValues]
  }

  /**
   * Get the best values card according to a prompt from a cluster of cards.
   */
  async getBestValuesCard(
    cards: CanonicalValuesCard[]
  ): Promise<ValuesCardData> {
    if (cards.length === 1) {
      return toDataModel(cards[0])
    }

    const message = JSON.stringify(cards.map((c) => toDataModelWithId(c)))

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: bestValuesCardPrompt },
        { role: "user", content: message },
      ],
      functions: [bestCardFunction],
      function_call: { name: bestCardFunction.name },
      temperature: 0.0,
    })
  
    const id: number = JSON.parse(
      response.choices[0].message.function_call!.arguments!
    ).best_values_card_id

    const card = cards.find((c) => c.id === id) as CanonicalValuesCard

    return toDataModel(card)
  }

  async similaritySearch(
    vector: number[],
    limit: number = 10,
    minimumDistance: number = 0.1
  ): Promise<Array<CanonicalValuesCard>> {
    const query = `SELECT DISTINCT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> '${JSON.stringify(
      vector
    )}'::vector as "_distance"
    FROM "CanonicalValuesCard" cvc
    ORDER BY "_distance" ASC
    LIMIT ${limit};`

    const result = await this.db.$queryRawUnsafe<
      Array<CanonicalValuesCard & { _distance: number }>
    >(query)

    return result.filter((r) => r._distance < minimumDistance)
  }

  /**
   * If a canonical values card exist that is essentially the same value as the provided candidate, return it.
   * Otherwise, return null.
   */
  async fetchSimilarCanonicalCard(
    candidate: ValuesCardData,
    limit: number = 5
  ): Promise<CanonicalValuesCard | null> {
    console.log(`Fetching similar canonical card, candidate: ${JSON.stringify(candidate)}`)

    // Embed the candidate.
    const card_embeddings = await embeddings.embedCandidate({ evaluationCriteria: candidate.evaluation_criteria || [] })

    console.log("Got card embeddings, fetching canonical card.")

    // Fetch `limit` canonical cards for the case based on similarity.
    const canonical = await this.similaritySearch(card_embeddings, limit, 0.1)

    console.log(`Got ${canonical.length} canonical cards`)

    // If we have no canonical cards, we can't deduplicate.
    if (canonical.length === 0) {
      console.log("No canonical cards found for candidate.")
      return null
    }

    //
    // Use a prompt to see if any of the canonical cards are the same value
    //
    const message = JSON.stringify({
      input_values_card: candidate,
      canonical_values_cards: canonical.map((c) => toDataModelWithId(c)),
    })

    console.log("Calling prompt for deduplication.")

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: dedupePrompt },
        { role: "user", content: message },
      ],
      functions: [dedupeFunction],
      function_call: { name: dedupeFunction.name },
      temperature: 0.0,
    })
    const matchingId: number | null | undefined = JSON.parse(
      response.choices[0].message!.function_call!.arguments
    ).canonical_card_id

    console.log(`Got response from prompt, canonical duplicate: ${matchingId}`)

    // Return the matching canonical card, or null if no such card exists.
    return canonical.find((c) => c.id === matchingId) ?? null
  }

  async fetchNonCanonicalizedValues(limit: number = 50) {
    return (await db.valuesCard.findMany({
      where: {
        canonicalCardId: null,
        quality: 'ok',
      },
      take: limit,
    })) as ValuesCard[]
  }

  async linkClusterToCanonicalCard(
    cluster: ValuesCard[],
    canonicalCard: CanonicalValuesCard
  ) {
    await db.valuesCard.updateMany({
      where: {
        id: { in: cluster.map((c) => c.id) },
      },
      data: { canonicalCardId: canonicalCard.id },
    })
  }
}

//
// Ingest function for deduplication.
//
// Type casting is a bit broken here, hence the `any` casts.
// Thread with caution.
//

export const deduplicate = inngest.createFunction(
  { name: "Deduplicate", concurrency: 1 }, // Run sequentially to avoid RCs.
  { cron: "0 * * * *" },
  async ({ step, logger }) => {
    logger.info(`Running deduplication.`)

    //
    // Prepare the service.
    //
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const service = new DeduplicationService(openai, db)

    // Get all non-canonicalized submitted values cards.
    const cards = (await step.run(
      `Get non-canonicalized cards from database`,
      async () => service.fetchNonCanonicalizedValues()
    )) as any as ValuesCard[]

    if (cards.length === 0) {
      logger.info(`No cards to deduplicate.`)

      return {
        message: `No cards to deduplicate.`,
      }
    }

    // Cluster the non-canonicalized cards with a prompt.
    const clusters = (await step.run(`Cluster cards using prompt`, async () =>
      service.cluster(cards)
    )) as any as ValuesCard[][]

    logger.info(`Found ${clusters.length} clusters.`)

    //
    // For each deduplicated non-canonical card, find canonical cards that are essentially
    // the same value and link them.
    //
    // If no such cards exist, canonicalize the duplicated non-canonical card and link the cluster
    // to the new canonical card.
    //
    let i = 0
    for (const cluster of clusters) {
      logger.info(`Deduplicating cluster ${++i} of ${cluster.length} cards.`)

      const representative = (await step.run(
        "Get best values card from cluster",
        async () => service.getBestValuesCard(cluster)
      )) as any as ValuesCardData

      const existingCanonicalDuplicate = (await step.run(
        "Fetch canonical duplicate",
        async () => service.fetchSimilarCanonicalCard(representative)
      )) as any as CanonicalValuesCard | null

      if (existingCanonicalDuplicate) {
        await step.run("Link cluster to existing canonical card", async () =>
          service.linkClusterToCanonicalCard(
            cluster,
            existingCanonicalDuplicate
          )
        )
      } else {
        const newCanonicalDuplicate = (await step.run(
          "Canonicalize representative",
          async () => service.createCanonicalCard(representative)
        )) as any as CanonicalValuesCard

        await step.run(
          "Link cluster to newly created canonical card",
          async () =>
            service.linkClusterToCanonicalCard(cluster, newCanonicalDuplicate)
        )
      }
    }

    logger.info(`Done. Deduplicated ${cards.length} cards.`)

    return {
      message: `Deduplicated ${cards.length} cards.`,
    }
  }
)