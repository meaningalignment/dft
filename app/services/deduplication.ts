import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import EmbeddingService from "./embedding"
import { ValuesCardData, model } from "~/lib/consts"
import { ChatCompletionFunctions, Configuration, OpenAIApi } from "openai-edge"
import { toDataModel, toDataModelWithId } from "~/utils"
import { db, inngest } from "~/config.server"
import { cases } from "~/lib/case"

//
// Prompts.
//

const sourceOfMeaningDefinition = `### Source of Meaning
A "source of meaning" is a concept similar to a value – it is a way of living that is important to you. Something that you pay attention to in a choice. They are more specific than words like "honesty" or "authenticity". They specify a particular *kind* of honesty and authenticity, specified as a path of attention.`

const valuesCardDefinition = `### Values Card
A "values card" is a representation of a "source of meaning". A values card has five fields: "id", "title", "instructions_short", "instructions_detailed", and "evaluation_criteria".`

const deduplicationInstructions = `### Deduplication Instructions
To determine if two or more values cards are about the same source of meaning, we can look at the "evaluation_criteria" field. The evaluation criteria specity a path of attention that the person with this card follow in relevant contexts. If two cards have the same evaluation criteria, even if worded very differently, or if one card has a subset of another card's evaluation criteria where the rest of the set "fit together" with the subset into a coherent value, they are still the same source of meaning.
The "title", "instructions_short" and "instructions_detailed" can be different even if two cards point towards the same source of meaning.`

const clusterPrompt = `You are a 'values card' deduplicator. You are given a list of 'sources of meaning', formatted as 'values cards'. Your job is to take this list and output a list of values cards clusters, where each cluster is about the same source of meaning.

${sourceOfMeaningDefinition}

${valuesCardDefinition}

${deduplicationInstructions}

### Output
Your output should be a nested list of integers, where each nested list is a cluster of values cards ids that all point towards the same source of meaning.
If a values card is about a unique source of meaning, it should be included in the list as a list with only one element (the id of the values card).
Every card in the output should be included in one and only one cluster.`

const dedupePrompt = `You are a 'values card' deduplicator. You are given an input source of meaning, formatted as a 'values card', and a list of other, canonical values cards. Your task is to determine if the source of meaning in the input values card is already represented by one of the canonical values. If so, you should output the id of the canonical values card that represents the source of meaning. If not, you should output null.

${sourceOfMeaningDefinition}

${valuesCardDefinition}

${deduplicationInstructions}

### Output
Your output should be the id of the canonical values card that represents the source of meaning of the provided non-canonical values card, or null if no such card exists.`

const bestValuesCardPrompt = `You are a "values card" assistant. You will be provided with a list of "values card" representing the same "source of meaning". Your task is to return the "id" of the "values card" that is best formulated according to the guidelines and critique examples below.

A "values card" is a representation of a "source of meaning". A values card has five fields: "id", "title", "instructions_short", "instructions_detailed", and "evaluation_criteria". The first one is an integer, the following three are strings and the last is an array of strings.

A "source of meaning" is a concept similar to a value – it is a way of living that is important to you. Something that you pay attention to in a choice. They are more specific than words like "honesty" or "authenticity". They specify a particular *kind* of honesty and authenticity, specified as a path of attention.

A source of meaning is distinct from similar concepts:
- A source of meaning is not a goal. A goal is something you want to achieve, like "become a doctor" or "get married". A source of meaning is a way of living, like "be a good friend" or "be a good listener".
- A source of meaning is not a moral principle. A source of meaning is not a rule that you think everyone should follow. It is a way of living that is important to the user, but not necessarily to others.
- A source of meaning is not a norm or a social expectation. A source of meaning is not something you do because you feel like you have to, or because you feel like you should. It is something the user does because it is intrinsically important to them.
- A source of meaning is not an internalized norm – a norm the user has adopted outside of the original social context. It is a way of living that produces a sense of meaning for you, not a way of living that you think is "right" or "correct".

# Card Guidelines

1. **Cards should be indeterminate.** The card should describe a way of living that has broad benefits and which might lead to many outcomes, where the journey itself is part of the good life for a person. It should not lead determinately towards one, narrow instrumental goal.
2. **Cards should not be about meeting others’ expectations.** They should be the kind of thing that is meaningful to someone.
3. **Cards should be positively stated**. The stuff in the “how” section should be things ChatGPT SHOULD attend to.
4. **Cards should use clear, simple language**. Anyone in the relevant context should be able to see what you mean about what to attend to. The instructions should be clear enough that you could use them in a survey to see whether or not someone was attending to those things.
5. **Cards should be as general as possible.** Avoid being unnecessarily specific, if the same source of meaning would be meaningful in other contexts.
6. **Cards should not have unnecessary elements.** All elements of the source of meaning should be required, and work together, in the context.
7. The title should be pithy, and unlikely to be confused with other similar sources of meaning.
8. The values card should be written from the perspective of how ChatGPT should respond to the situation in the first message. They should reflect the user's sources of meaning, not yours or those of ChatGPT's creators.


# Card Critiques

Below are some critiques of values cards, and how they could be improved by following the guidelines above. This will help you better understand what makes a good values card.

### Card

{{
  "evaluation_criteria":[
    "MOMENTS where people become leaders.",
    "INSIGHTS that emerge through grappling with morally fraught questions",
    "CAPACITIES that develop when a person tries to be free and self-directed",
    "WISDOM that emerges in a discursive, responsible context",
  ],
  "instructions_detailed":"ChatGPT can foster new leaders, insights they can have, capacities they can develop, and wisdom that emerges in deliberation, which together add up to a democratic empowerment.",
  "instructions_short":"ChatGPT should foster participation by helping people become leaders.",
  "title":"Faith in People",
}}

### Critique

- **Cards should be indeterminate:**

    The “new leaders” / “Moments” entries seems useful only if it leads to that one outcome.


### Improved Card

{{
  "evaluation_criteria":[
    "CHANGES in people when entrusted with the work of self-determination",
    "INSIGHTS that emerge through grappling with morally fraught questions",
    "CAPACITIES that develop when a person tries to be free and self-directed",
    "WISDOM that emerges in a discursive, responsible context",
  ],
  "instructions_detailed":"ChatGPT can foster changes in people, insights they can have, capacities they can develop, and wisdom that emerges in deliberation, which together add up to a democratic empowerment.",
  "instructions_short":"ChatGPT should foster participation by helping people become leaders.",
  "title":"Faith in People",
}}

## Example 2

### Card

{{
  "evaluation_criteria":[
    "COURSES she could take about the subject",
    "QUIET PLACES and PEOPLE that make it is easier for her to decide for herself",
    "DISCREPANCIES between the status quo and her own moral compass",
    "EMOTIONS that spark her agency and power",
    "ACTIONS she could take that would address those emotions",
  ],
  "instructions_detailed":"ChatGPT can help her find courses, environments, emotions, actions, and discrepancies which, together, add up to an embodied sense of what would be just and what actions to take."
  "instructions_short":"ChatGPT should ask the girl to feel into what she thinks is right.",
  "title":"Embodied Justice",
}}

### Critique

- **Cards should not have unnecessary elements.**

    Courses are unrelated to this value.


### Improved Card

{{
  "evaluation_criteria":[
    "QUIET PLACES and PEOPLE that make it is easier for her to decide for herself",
    "DISCREPANCIES between the status quo and her own moral compass",
    "EMOTIONS that spark her agency and power",
    "ACTIONS she could take that would address those emotions",
  ],
  "instructions_detailed":"ChatGPT can help her find environments, emotions, actions, and discrepancies which, together, add up to an embodied sense of what would be just and what actions to take.",
  "instructions_short":"ChatGPT should ask the girl to feel into what she thinks is right.",
  "title":"Embodied Justice"
}}

# Output

You should return the "id" of the "values card" that is best formulated according to the guidelines and critique examples above.`

//
// Functions.
//

const submitBestValuesCard: ChatCompletionFunctions = {
  name: "submit_best_values_card",
  description: "Submit the best formatted values card.",
  parameters: {
    type: "object",
    properties: {
      values_card_id: {
        type: "integer",
        description: "The id of the values card that is best formatted.",
      },
    },
    required: ["values_card_id"],
  },
}

const submitMatchingCanonicalCard: ChatCompletionFunctions = {
  name: "submit_matching_canonical_values_card",
  description:
    "Submit a canonical values card that is about the same source of meaning as the provided non-canonical values card. If no such card exists, submit null.",
  parameters: {
    type: "object",
    properties: {
      canonical_card_id: {
        type: "number",
        description:
          "The id of the canonical values card that is about the same source of meaning as the provided non-canonical values card. Should be null if no such card exists",
      },
    },
  },
}

const submitClusters: ChatCompletionFunctions = {
  name: "submit_clusters",
  description:
    "Submit a list of values card clusters, where each cluster is about a unique source of meaning.",
  parameters: {
    type: "object",
    properties: {
      clusters: {
        type: "array",
        description:
          "A list of clusters, where each cluster is a list of values card ids.",
        items: {
          type: "array",
          items: {
            type: "number",
            description: "A values card id.",
          },
        },
      },
    },
  },
}

/**
 * Handles all logic around deduplicating and canonicalizing values cards.
 */
export default class DeduplicationService {
  private embeddings: EmbeddingService
  private openai: OpenAIApi
  private db: PrismaClient

  constructor(
    embeddings: EmbeddingService,
    openai: OpenAIApi,
    db: PrismaClient
  ) {
    this.embeddings = embeddings
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
    await this.embeddings.embedCanonicalCard(canonical)
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
    const response = await this.openai.createChatCompletion({
      model: "gpt-4-32k-0613",
      messages: [
        { role: "system", content: clusterPrompt },
        { role: "user", content: message },
      ],
      function_call: { name: submitClusters.name },
      functions: [submitClusters],
    })
    const data = await response.json()

    const clusters = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).clusters

    // Return a list of clustered values cards.
    return clusters.map((cluster: number[]) =>
      cluster.map((id: number) => cards.find((c) => c.id === id) as ValuesCard)
    )
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

    const response = await this.openai.createChatCompletion({
      model,
      messages: [
        { role: "system", content: dedupePrompt },
        { role: "user", content: message },
      ],
      functions: [submitBestValuesCard],
      function_call: { name: submitBestValuesCard.name },
    })
    const data = await response.json()
    const id: number = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).values_card_id

    const card = cards.find((c) => c.id === id) as CanonicalValuesCard

    return toDataModel(card)
  }

  async similaritySearch(
    vector: number[],
    caseId: string,
    limit: number = 10,
    minimumDistance: number = 0.1
  ): Promise<Array<CanonicalValuesCard>> {
    const query = `SELECT DISTINCT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> '${JSON.stringify(
      vector
    )}'::vector as "_distance" 
    FROM "CanonicalValuesCard" cvc
    INNER JOIN "ValuesCard" vc
    ON vc."canonicalCardId" = cvc.id
    INNER JOIN "Chat" c
    ON c.id = vc."chatId"
    WHERE c."caseId" = '${caseId}'
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
    caseId: string,
    limit: number = 3,
    logger?: any
  ): Promise<CanonicalValuesCard | null> {
    // Embed the candidate.
    const embeddings = await this.embeddings.embedCandidate(candidate)

    // Fetch `limit` canonical cards for the case based on similarity.
    const canonical = await this.similaritySearch(
      embeddings,
      caseId,
      limit,
      0.1
    )

    // If we have no canonical cards, we can't deduplicate.
    if (canonical.length === 0) {
      logger?.info("No canonical cards found for candidate.")
      return null
    }

    //
    // Use a prompt to see if any of the canonical cards are the same value
    //
    const message = JSON.stringify({
      input_values_card: candidate,
      canonical_values_cards: canonical.map((c) => toDataModelWithId(c)),
    })

    const response = await this.openai.createChatCompletion({
      model,
      messages: [
        { role: "system", content: dedupePrompt },
        { role: "user", content: message },
      ],
      functions: [submitMatchingCanonicalCard],
      function_call: { name: submitMatchingCanonicalCard.name },
    })
    const data = await response.json()
    const matchingId: number | null | undefined = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).canonical_card_id

    // Return the matching canonical card, or null if no such card exists.
    return canonical.find((c) => c.id === matchingId) ?? null
  }

  async fetchNonCanonicalizedValues(caseId: string, limit: number = 200) {
    return (await db.valuesCard.findMany({
      where: {
        canonicalCardId: null,
        chat: {
          caseId,
        },
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

export const deduplicateCase = inngest.createFunction(
  { name: "Deduplicate Case", concurrency: 1 }, // Run sequentially to avoid RCs.
  { event: "deduplicate.case" },
  async ({ step, logger, event }) => {
    // The case to deduplicate.
    const caseId = event.data.caseId as string

    // verify the case exists.
    if (!cases.map((c) => c.id).includes(caseId)) {
      throw Error(`Unknown case "${caseId}"`)
    }

    logger.info(`Running deduplication for case ${caseId}`)

    //
    // Prepare the service.
    //
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)
    const embeddings = new EmbeddingService(openai, db)
    const service = new DeduplicationService(embeddings, openai, db)

    // Get all non-canonicalized submitted values cards.
    const cards = (await step.run(
      `Get non-canonicalized cards from database for case ${caseId}`,
      async () => service.fetchNonCanonicalizedValues(caseId)
    )) as any as ValuesCard[]

    if (cards.length === 0) {
      return {
        message: `No cards to deduplicate for case ${caseId}.`,
      }
    }

    // Cluster the non-canonicalized cards with a prompt.
    const clusters = (await step.run(
      `Cluster cards using prompt for `,
      async () => service.cluster(cards)
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
        async () => service.fetchSimilarCanonicalCard(representative, caseId)
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

export const deduplicate = inngest.createFunction(
  { name: "Deduplicate", concurrency: 1 }, // Run sequentially to avoid RCs.
  { cron: "0 */3 * * *" },
  async ({ step, logger }) => {
    logger.info("Deduplicating cases.")

    for (const caseData of cases) {
      logger.info(`Deduplicating case ${caseData.id}`)

      await step.sendEvent({
        name: "deduplicate.case",
        data: { caseId: caseData.id },
      })
    }

    return {
      message: `Started deduplication for ${cases.length} cases.`,
    }
  }
)
