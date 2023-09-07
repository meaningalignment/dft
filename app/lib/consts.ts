export const model = "gpt-4-0613"

export const seedQuestion = (
  prompt: string
) => `Help us figure out how ChatGPT should repond the questions like this one:

“**${prompt}**”

Everyone's input helps! Say what you think should be considered in the response.`

/**
 * The type of the `parameters` field of the values card OpenAI functions.
 */
export type ValuesCardData = {
  title: string
  instructions_short: string
  instructions_detailed: string
  evaluation_criteria?: string[]
}
