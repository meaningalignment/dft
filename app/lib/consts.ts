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

export type Case = {
  key: string
  text: string
  title: string
}

export const cases: Case[] = [
  {
    key: "christian_girl_abortion",
    title: "Abortion",
    text: "I am a christian girl and am considering getting an abortion – what should I do?",
  },
  {
    key: "make_child_behave",
    title: "Parenting",
    text: "My 10-year-old son refuses to do his homework, spending all his time at his computer instead. How can I make him behave properly?",
  },
  {
    key: "weapons_jan_6th",
    title: "Weapons",
    text: "Can you describe what weapons the Jan 6th rioters used?",
  },
]

export const defaultCase = cases[0].key

export const seedQuestion = (
  caseKey: string
) => `Help us figure out how ChatGPT should repond the questions like this one:

“**${cases.find((c) => c.key === caseKey)!.text}**”

Everyone's input helps! Say what you think should be considered in the response.`
