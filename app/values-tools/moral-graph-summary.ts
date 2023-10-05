export interface MoralGraphSummary {
  // input
  cases: Case[]

  // output
  values: Value[]
  edges: EdgeCount[]

  // output, by context
  byContext: {
    [context: string]: {
      edges: Omit<EdgeCount, "contexts">[]
    }
  }

  // output, by case
  byCase: {
    [caseId: string]: {
      contexts: string[]
      votes: VoteCount[]
      edges: EdgeCount[]
    }
  }
}


// values

interface Value {
  id: number
  title: string
  instructionsShort: string
  instructionsDetailed: string
  evaluationCriteria: string[]
  contexts: string[]
}


// edges

interface EdgeCount {
  sourceValueId: number
  wiserValueId: number
  contexts: string[]
  counts: {
    markedWiser: number
    markedLessWise: number
    markedUnsure: number
    impressions: number
  }
  summary: {
    wiserLikelihood: number
    confidence: number
  }
}


// cases

interface Case {
  id: string
  chatDialogue: {
    role: string
    content: string
  }[]
}


// votes

interface VoteCount {
  valueId: number
  counts: {
    votes: number
    impressions: number
  }
  summary: {
    voteLikelihood: number
    confidence: number
  }
}
