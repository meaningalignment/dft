export interface MoralGraphSummary {
  // input
  input: Input

  // output
  values: Value[]
  edges: EdgeCount[]
}


// values

interface Value {
  id: number
  title: string
  instructionsShort: string
  instructionsDetailed: string
  evaluationCriteria: string[]
}


// edges

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


// input filters

interface Input {
  caseId?: "abortion" | "weapons" | "parenting"
  dateRange?: {
    from: string
    to: string
  }
  prolificOnly?: boolean
  politicalAffiliation?: "republican" | "democrat"
}

