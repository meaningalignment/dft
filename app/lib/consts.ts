export const model = "gpt-4-0613"

/**
 * The type of the `parameters` field of the values card OpenAI functions.
 */
export type ValuesCardData = {
  title: string
  instructions_short: string
  instructions_detailed: string
  evaluation_criteria?: string[]
}
