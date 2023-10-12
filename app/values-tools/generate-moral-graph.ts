import { db } from "~/config.server"
import { MoralGraphSummary } from "./moral-graph-summary"
import { Prisma } from "@prisma/client";

// some utilities

function calculateEntropy(responseCounts: Record<string, number>): number {
  const total = Object.values(responseCounts).reduce((acc, val) => acc + val, 0);
  let entropy = 0;

  for (const count of Object.values(responseCounts)) {
    const probability = count / total;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  }

  return entropy;
}

type Key = `${number},${number}`;

class PairMap {
  private data: Map<Key, RawEdgeCount> = new Map();
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
      });
    }
    return this.data.get(`${a},${b}`)!
  }
}


// main

type Output = Pick<MoralGraphSummary, "values" | "edges">
type RawEdgeCount = Omit<MoralGraphSummary["edges"][0], "summary">

interface Options {
  includeAllEdges?: boolean
  edgeWhere?: Prisma.EdgeWhereInput
}

export async function summarizeGraph(options: Options = {}): Promise<Output> {
  console.log('summarizeGraph options', options)
  const values = await db.canonicalValuesCard.findMany()
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
  // do the opposite
  for (const edge of edges) {
    const existing = pairs.get(edge.toId, edge.fromId)
    existing.contexts.push(edge.contextId)
    existing.counts.impressions++
    if (edge.relationship === "upgrade") existing.counts.markedLessWise++
    // Not sure if this should count in both directions
    // if (edge.relationship === "not_sure") existing.counts.markedUnsure++
  }

  // cook them down
  const cookedEdges = pairs.all().map((edge) => {
    const contexts = [...new Set(edge.contexts)]
    const total = edge.counts.markedWiser + edge.counts.markedNotWiser + edge.counts.markedUnsure + edge.counts.markedLessWise
    const wiserLikelihood = (edge.counts.markedWiser - edge.counts.markedLessWise) / total
    const entropy = calculateEntropy(edge.counts)
    return { ...edge, contexts, summary: { wiserLikelihood, entropy } }
  })

  // eliminate edges with low wiserLikelihood, low signal, or no consensus
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

  const extraStuff: any = {}
  if (options.includeAllEdges) {
    extraStuff["allEdges"] = cookedEdges
  }

  return {
    values: values.filter((n) => referencedNodeIds.has(n.id)),
    edges: trimmedEdges,
    ...extraStuff,
  }
}
