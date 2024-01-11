import { db } from "~/config.server"
import { EdgeStats, MoralGraphSummary, Value } from "./moral-graph-summary"
import { Prisma } from "@prisma/client"

function calculateEntropy(responseCounts: Record<string, number>): number {
  const total = Object.values(responseCounts).reduce((acc, val) => acc + val, 0)
  let entropy = 0

  for (const count of Object.values(responseCounts)) {
    const probability = count / total
    if (probability > 0) {
      entropy -= probability * Math.log2(probability)
    }
  }

  return entropy
}

type NodeId = number
type PageRank = Record<NodeId, number>

function initializePageRank(nodes: NodeId[]): PageRank {
  const rank: PageRank = {}
  nodes.forEach((node) => (rank[node] = 1 / nodes.length))
  return rank
}

function calculatePageRankWeighted(
  edges: EdgeStats[],
  dampingFactor = 0.85,
  iterations = 100
): PageRank {
  const nodes = Array.from(
    new Set(edges.flatMap((edge) => [edge.sourceValueId, edge.wiserValueId]))
  )
  let pageRank = initializePageRank(nodes)

  for (let i = 0; i < iterations; i++) {
    const newRank: PageRank = {}
    nodes.forEach(
      (node) => (newRank[node] = (1 - dampingFactor) / nodes.length)
    )

    edges.forEach((edge) => {
      const outgoingEdges = edges.filter(
        (e) => e.sourceValueId === edge.sourceValueId
      )
      const totalWeight = outgoingEdges.reduce(
        (sum, e) => sum + e.summary.wiserLikelihood,
        0
      )
      if (totalWeight > 0) {
        newRank[edge.wiserValueId] +=
          (dampingFactor *
            pageRank[edge.sourceValueId] *
            edge.summary.wiserLikelihood) /
          totalWeight
      }
    })

    pageRank = newRank
  }

  return pageRank
}

function calculatePageRank(
  edges: EdgeStats[],
  dampingFactor = 0.85,
  iterations = 100
): PageRank {
  const nodes = Array.from(
    new Set(edges.flatMap((edge) => [edge.sourceValueId, edge.wiserValueId]))
  )
  let pageRank = initializePageRank(nodes)

  for (let i = 0; i < iterations; i++) {
    const newRank: PageRank = {}
    nodes.forEach(
      (node) => (newRank[node] = (1 - dampingFactor) / nodes.length)
    )

    edges.forEach((edge) => {
      const outgoingEdges = edges.filter(
        (e) => e.sourceValueId === edge.sourceValueId
      ).length
      if (outgoingEdges > 0) {
        newRank[edge.wiserValueId] +=
          (dampingFactor * pageRank[edge.sourceValueId]) / outgoingEdges
      }
    })

    pageRank = newRank
  }

  return pageRank
}

type Key = `${number},${number}`

class PairMap {
  private data: Map<Key, RawEdgeCount> = new Map()
  all(): RawEdgeCount[] {
    return Array.from(this.data.values())
  }
  get(a: number, b: number): RawEdgeCount {
    if (!this.data.has(`${a},${b}`)) {
      this.data.set(`${a},${b}`, {
        sourceValueId: a,
        wiserValueId: b,
        contexts: [],
        counts: {
          markedWiser: 0,
          markedNotWiser: 0,
          markedLessWise: 0,
          markedUnsure: 0,
          impressions: 0,
        },
      })
    }
    return this.data.get(`${a},${b}`)!
  }
}

type RawEdgeCount = Omit<MoralGraphSummary["edges"][0], "summary">

export interface Options {
  includeAllEdges?: boolean
  includePageRank?: boolean
  edgeWhere?: Prisma.EdgeWhereInput
}

export async function summarizeGraph(
  options: Options = {}
): Promise<MoralGraphSummary> {
  const values = (await db.canonicalValuesCard.findMany()) as Value[]
  const edges = await db.edge.findMany({ where: options.edgeWhere })

  const pairs = new PairMap()

  for (const edge of edges) {
    const existing = pairs.get(edge.fromId, edge.toId)
    existing.contexts.push(edge.contextId)
    existing.counts.impressions++
    if (edge.relationship === "upgrade") existing.counts.markedWiser++
    if (edge.relationship === "no_upgrade") existing.counts.markedNotWiser++
    if (edge.relationship === "not_sure") existing.counts.markedUnsure++
  }

  // Do the opposite.
  for (const edge of edges) {
    const existing = pairs.get(edge.toId, edge.fromId)
    existing.contexts.push(edge.contextId)
    existing.counts.impressions++
    if (edge.relationship === "upgrade") existing.counts.markedLessWise++
  }

  // Cook them down.
  const cookedEdges = pairs.all().map((edge) => {
    const contexts = [...new Set(edge.contexts)]
    const total =
      edge.counts.markedWiser +
      edge.counts.markedNotWiser +
      edge.counts.markedUnsure +
      edge.counts.markedLessWise
    const wiserLikelihood =
      (edge.counts.markedWiser - edge.counts.markedLessWise) / total
    const entropy = calculateEntropy(edge.counts)
    return { ...edge, contexts, summary: { wiserLikelihood, entropy } }
  })

  // Eliminate edges with low wiserLikelihood, low signal, or no consensus.
  const trimmedEdges = cookedEdges.filter((edge) => {
    if (!edge.counts.markedWiser) return false
    if (edge.summary.wiserLikelihood < 0.33) return false
    if (edge.summary.entropy > 1.69) return false
    if (edge.counts.markedWiser < 2) return false
    return true
  })

  const referencedNodeIds = new Set<number>()
  for (const link of trimmedEdges) {
    referencedNodeIds.add(link.sourceValueId)
    referencedNodeIds.add(link.wiserValueId)
  }

  const extra: any = {}
  if (options.includeAllEdges) {
    extra["allEdges"] = cookedEdges
  }

  if (options.includePageRank) {
    const pageRank = calculatePageRankWeighted(trimmedEdges)
    const votes = await db.vote.findMany({
      where: { user: options.edgeWhere?.user },
    })

    for (const node of values) {
      node.pageRank = pageRank[node.id]
      node.votes = votes.filter((v) => v.valuesCardId === node.id).length
    }
  }

  return {
    values: values.filter((n) => referencedNodeIds.has(n.id)),
    edges: trimmedEdges,
    ...extra,
  }
}
