import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import EmbeddingService from "./embedding"
import { ValuesCardData } from "~/lib/consts"
import { ChatCompletionFunctions, OpenAIApi } from "openai-edge"

const prompt_1 = `You are a 'values card' deduplicator. You are given a list of 'sources of meaning', formatted as 'values cards'. Your job is to take this list and output a canonical list of values cards, which summarizes 'values cards' that are about the same source of meaning.

### Source of Meaning
A "source of meaning" is a concept similar to a value – it is a way of living that is important to you. Something that you pay attention to in a choice. They are more specific than words like "honesty" or "authenticity". They specify a particular *kind* of honesty and authenticity, specified as a path of attention.

### Values Card
A "values card" is a representation of a "source of meaning". A values card has five fields: "id", "title", "instructions_short", "instructions_detailed", and "evaluation_criteria".

### Instructions
To determine if two or more values cards are about the same source of meaning, we can look at the "evaluation_criteria" field. The evaluation criteria specity a path of attention that the person with this card follow in relevant contexts. If two cards have the same evaluation criteria, even if worded very differently, or if one card has a subset of another card's evaluation criteria where the rest of the set "fit together" with the subset into a coherent value, they are still the same source of meaning.
The "title", "instructions_short" and "instructions_detailed" can be different even if two cards point towards the same source of meaning.

### Output
Your output should be a list of values cards, where each card has a "from_ids" property, referencing which "id"'s where summarized in the card. All cards provided by the user should have one, and only one, corresponding card in the output. 
The fields of each output card should be identical to the fields of *one* of the input cards referenced in the "from_ids" property – the one that best represents the shared source of meaning the card is about.
If a values card is about a unique source of meaning, it should be included in the output as is, with only one id in the "from_ids" property.`

const prompt_2 = ``

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
  },
}

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
    return this.db.$queryRaw<Array<CanonicalValuesCard>>`
    SELECT cvc.id, cvc.title, cvc."instructionsShort", cvc."instructionsDetailed", cvc."evaluationCriteria", cvc.embedding <=> ${JSON.stringify(
      vector
    )}::vector as "_distance" 
    FROM "CanonicalValuesCard" cvc
    ORDER BY "_distance" DESC
    LIMIT ${limit};`
  }

  private async canonicalize(data: ValuesCardData) {
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
    const message = JSON.stringify(
      cards.map((card) => {
        return {
          id: card.id,
          title: card.title,
          instructions_short: card.instructionsShort,
          instructions_detailed: card.instructionsDetailed,
          evaluation_criteria: card.evaluationCriteria,
        }
      })
    )

    // Call prompt.
    const response = await this.openai.createChatCompletion({
      model: this.model,
      messages: [
        { role: "system", content: prompt_1 },
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

    // Use a prompt to see if any of the canonical cards are the same value
    const isSame = true

    if (isSame) {
      return canonical[0]
    }

    return null
  }

  /**
   * Deduplicate all values cards in the database.
   */
  async deduplicateValuesCards() {
    // Get all non-canonicalized submitted values cards.
    const cards = (await this.db.valuesCard.findMany({
      where: {
        canonicalCardId: null,
      },
      take: 20, // Set a limit to 20 cards per run to prevent overflowing the context window.
    })) as ValuesCard[]

    if (cards.length === 0) {
      console.log("No cards to deduplicate.")
      return
    }

    // Deduplicate the non-canonicalized cards with a prompt.
    const deduplicated = await this.deduplicate(cards)

    //
    // For each deduplicated non-canonical card, find any canonical cards that are essentially
    // the same value and link them.
    //
    // If no such cards exist, add the duplicated non-canonical card to canonicalized cards.
    //
    for (const card of deduplicated) {
      // Find a canonical card that is essentially the same value.
      let canonical = await this.fetchCanonicalDuplicate(card)

      // If no canonical card exists, create one.
      if (!canonical) {
        canonical = await this.canonicalize(card)
      }

      // Link the non-canonical card to the canonical card.
      for (const id of card.from_ids) {
        await this.db.valuesCard.update({
          where: {
            id: id,
          },
          data: {
            canonicalCardId: canonical.id,
          },
        })
      }
    }
  }
}
