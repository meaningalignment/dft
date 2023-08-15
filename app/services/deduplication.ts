import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import EmbeddingService from "./embedding"
import { ValuesCardData } from "~/lib/consts"
import { ChatCompletionFunctions, OpenAIApi } from "openai-edge"
import { toDataModel } from "~/utils"

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

const clusterDuplicatesPrompt = `You are a 'values card' deduplicator. You are given a list of 'sources of meaning', formatted as 'values cards'. Your job is to take this list and output a canonical list of values cards, which summarizes 'values cards' that are about the same source of meaning.

${sourceOfMeaningDefinition}

${valuesCardDefinition}

${deduplicationInstructions}

### Output
Your output should be a list of values cards, where each card has a "from_ids" property, referencing which "id"'s where summarized in the card. All cards provided by the user should have one, and only one, corresponding card in the output. 
The fields of each output card should be identical to the fields of *one* of the input cards referenced in the "from_ids" property – the one that best represents the shared source of meaning the card is about.
If a values card is about a unique source of meaning, it should be included in the output as is, with only one id in the "from_ids" property.`

const findMatchingCanonicalCardPrompt = `You are a 'values card' deduplicator. You are given an input source of meaning, formatted as a 'values card', and a list of other, canonical values cards. Your task is to determine if the source of meaning in the input values card is already represented by one of the canonical values. If so, you should output the id of the canonical values card that represents the source of meaning. If not, you should output null.

${sourceOfMeaningDefinition}

${valuesCardDefinition}

${deduplicationInstructions}

### Output
Your output should be the id of the canonical values card that represents the source of meaning of the provided non-canonical values card, or null if no such card exists.`

//
// Functions.
//

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

const submitCanonicalValuesCards: ChatCompletionFunctions = {
  name: "submit_canonical_values_cards",
  description:
    "Submit a list of canonical values cards. Each card should have a title, instructions_short, instructions_detailed, evaluation_criteria and from_ids fields. The from_ids field should be a list of ids of the cards that were summarized in this card.",
  parameters: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from_ids: {
              type: "array",
              items: {
                type: "number",
              },
            },
            evaluation_criteria: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "A list of things to attend to that can be used to evaluate whether ChatGPT is following this source of meaning.",
            },
            instructions_detailed: {
              type: "string",
              description:
                "A detailed instruction for how ChatGPT could act based on this source of meaning.",
            },
            instructions_short: {
              type: "string",
              description:
                "A short instruction for how ChatGPT could act based on this source of meaning.",
            },
            title: {
              type: "string",
              description: "The title of the values card.",
            },
          },
        },
      },
    },
    required: ["cards"],
  },
}

//
// Types.
//

type SynthesizedCard = ValuesCardData & {
  from_ids: number[]
}

/**
 * Handles all logic around deduplicating and canonicalizing values cards.
 */
export default class DeduplicationService {
  private embeddings: EmbeddingService
  private model: string
  private openai: OpenAIApi
  private db: PrismaClient

  constructor(
    embeddings: EmbeddingService,
    openai: OpenAIApi,
    model: string = "gpt-4",
    db: PrismaClient
  ) {
    this.embeddings = embeddings
    this.openai = openai
    this.model = model
    this.db = db
  }

  /**
   * Perform a cosine similarity search on `CanonicalValuesCard`.
   */
  private async similaritySearch(
    vector: number[],
    limit: number = 10
  ): Promise<Array<CanonicalValuesCard>> {
    // @TODO include a minimum distance
    return this.db.$queryRaw<Array<CanonicalValuesCard>>`
    SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> ${JSON.stringify(
      vector
    )}::vector as "_distance" 
    FROM "CanonicalValuesCard" cvc
    ORDER BY "_distance" DESC
    LIMIT ${limit};`
  }

  /**
   * Create an entry in `CanonicalValuesCard`.
   */
  private async createCanonicalCard(data: ValuesCardData) {
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
  private async deduplicate(cards: ValuesCard[]): Promise<SynthesizedCard[]> {
    const message = JSON.stringify(cards.map((c) => this.formatContent(c)))

    // Call prompt.
    const response = await this.openai.createChatCompletion({
      model: this.model,
      messages: [
        { role: "system", content: clusterDuplicatesPrompt },
        { role: "user", content: message },
      ],
      function_call: { name: submitCanonicalValuesCards.name },
      functions: [submitCanonicalValuesCards],
    })
    const data = await response.json()

    const deduplicatedCards = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).cards as SynthesizedCard[]

    return deduplicatedCards
  }

  /**
   * If a canonical values card exist that is essentially the same value as the provided candidate, return it.
   * Otherwise, return null.
   */
  async fetchCanonicalDuplicate(
    candidate: ValuesCardData,
    limit: number = 3
  ): Promise<CanonicalValuesCard | null> {
    // Embed the candidate.
    const embeddings = await this.embeddings.embedCandidate(candidate)

    // Fetch `limit` canonical cards based on similarity.
    const canonical = await this.similaritySearch(embeddings, limit)

    // If we have no canonical cards, we can't deduplicate.
    if (canonical.length === 0) {
      return null
    }

    //
    // Use a prompt to see if any of the canonical cards are the same value
    //
    const message = JSON.stringify({
      input_values_card: candidate,
      canonical_values_cards: canonical.map((c) => {
        return {
          id: c.id,
          ...toDataModel(c),
        }
      }),
    })

    const response = await this.openai.createChatCompletion({
      model: this.model,
      messages: [
        { role: "system", content: findMatchingCanonicalCardPrompt },
        { role: "user", content: message },
      ],
      functions: [submitMatchingCanonicalCard],
      function_call: { name: submitMatchingCanonicalCard.name },
    })
    const data = await response.json()
    const matchingId: number | null = JSON.parse(
      data.choices[0].message.function_call.arguments
    ).canonical_card_id

    // Return the matching canonical card, or null if no such card exists.
    return canonical.find((c) => c.id === matchingId) ?? null
  }

  /**
   * Deduplicate all values cards in the database.
   *
   * Long operation that should be run in the background.
   */
  async deduplicateAll() {
    // Get all non-canonicalized submitted values cards.
    const cards = (await this.db.valuesCard.findMany({
      where: {
        canonicalCardId: null,
      },
      take: 10, // Set a limit to 10 cards per run to prevent overflowing the context window.
    })) as ValuesCard[]

    if (cards.length === 0) {
      console.log("No cards to deduplicate.")
      return
    }

    // Deduplicate the non-canonicalized cards with a prompt.
    const deduplicated = await this.deduplicate(cards)

    //
    // For each deduplicated non-canonical card, find canonical cards that are essentially
    // the same value and link them.
    //
    // If no such cards exist, canonicalize the duplicated non-canonical card.
    //
    for (const card of deduplicated) {
      // Find a canonical card that is essentially the same value.
      let canonical = await this.fetchCanonicalDuplicate(card)

      // If no canonical card exists, create one.
      if (!canonical) {
        canonical = await this.createCanonicalCard(card)
      }

      // Link the non-canonical cards to the canonical card.
      await this.db.valuesCard.updateMany({
        where: {
          id: { in: card.from_ids },
        },
        data: { canonicalCardId: canonical.id },
      })
    }
  }
}
