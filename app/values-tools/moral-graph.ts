export interface MoralGraph {
  cases: Case[]
  values: Value[]
  edges: Edge[]
}


// cases

interface Case {
  name: string
  chatDialogue: {
    role: string
    content: string
  }[]
  contexts: string[]
}


// values

interface Value {
  id: number
  title: string
  instructionsShort: string
  instructionsDetailed: string
  evaluationCriteria: string[]
  votes: {
    all: VoteInfo
    byCase: {
      [caseName: string]: VoteInfo
    }
  }
}

interface VoteInfo {
  votes: number
  impressions: number
  avg: number
  confidence: number
}


// edges

interface Edge {
  sourceValueId: number
  wiserValueId: number
  edgeStrength: {
    overall: EdgeInfo
    byContext: {
      [contextName: string]: EdgeInfo
    }
  }
}

interface EdgeInfo {
  markedWiser: number
  markedLessWise: number
  markedUnsure: number
  impressions: number
  weight: number
  confidence: number
}
