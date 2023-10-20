export interface MoralGraphSummary {
  values: Value[]
  edges: EdgeStats[]
}

interface Value {
  id: number
  title: string
  instructionsShort: string
  instructionsDetailed: string
  evaluationCriteria: string[]
}

interface EdgeStats {
  sourceValueId: number
  wiserValueId: number
  contexts: string[]
  counts: {
    markedWiser: number
    markedNotWiser: number
    markedLessWise: number
    markedUnsure: number
    impressions: number
    politics: {
      republican: number
      democrat: number
      other: number
    }
  }
  summary: {
    wiserLikelihood: number
    entropy: number
  }
}
