import { dftStyle } from "~/values-tools/value-styles"

/**
 * The type of the `parameters` field of the values card OpenAI functions.
 */
export type ValuesCardData = {
  title: string
  instructions_short: string
  instructions_detailed: string
  evaluation_criteria?: string[]
}

export const prolificRuns = {
  prolific_50: {
    start: new Date("Sep 21, 2023 18:00:00 UTC"),
    end: new Date("Sep 21, 2023 20:00:00 UTC"),
  },
  prolific_125: {
    start: new Date("Oct 10, 2023 09:00:00 UTC"),
    end: new Date("Oct 10, 2023 14:30:00 UTC"),
  },
  prolific_325: {
    start: new Date("Oct 6, 2023 14:00:00 UTC"),
    end: new Date("Oct 9, 2023 23:00:00 UTC"),
  },
}

export const valueStyle = dftStyle