export interface MoralGraphSummary {
  values: Value[]
  edges: EdgeCount[]
}

interface Value {
  id: number
  title: string
  instructionsShort: string
  instructionsDetailed: string
  evaluationCriteria: string[]
}

interface EdgeCount {
  sourceValueId: number
  wiserValueId: number
  contexts: string[]
  counts: {
    markedWiser: number
    markedNotWiser: number
    markedLessWise: number
    markedUnsure: number
    impressions: number
  }
  summary: {
    wiserLikelihood: number
    entropy: number
  }
}
