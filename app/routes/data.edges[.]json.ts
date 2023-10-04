import { Edge } from "@prisma/client"
import { json } from "@remix-run/node"
import { db } from "~/config.server"

function score(edge: Edge) {
  if (edge.relationship === "upgrade") return 1
  if (edge.relationship === "no_upgrade") return -0.2
  else return 0
}

async function getEdges(caseId?: string) {
  if (!caseId) {
    return db.edge.findMany()
  }

  const contexts = await db.context.findMany({
    where: { ContextsOnCases: { some: { caseId } } },
  })

  return db.edge.findMany({
    where: { contextId: { in: contexts.map((c) => c.id) } },
  })
}

export async function buildGraph(caseId?: string) {
  const nodes = await db.canonicalValuesCard.findMany()
  const referencedNodeIds = new Set<number>()
  const edgesFromDb = await getEdges(caseId)
  const pairs: { [k: string]: number[] } = {}
  for (const edge of edgesFromDb) {
    if (edge.fromId < edge.toId) {
      const k = `${edge.fromId}-${edge.toId}`
      const existing = pairs[k] ?? []
      pairs[k] = [...existing, score(edge)]
    } else {
      const k = `${edge.toId}-${edge.fromId}`
      const existing = pairs[k] ?? []
      pairs[k] = [...existing, -score(edge)]
    }
  }
  const links = Object.entries(pairs)
    .map(([k, scores]) => {
      const [fromId, toId] = k.split("-").map(Number)
      const total = scores.reduce((a, b) => a + b, 0)
      const avg = total / scores.length
      const count = scores.length
      if (avg > 0) return { source: fromId, target: toId, count, avg }
      else return { target: fromId, source: toId, count, avg: -avg }
    })
    .filter((w) => w.count > 1)

  for (const link of links) {
    referencedNodeIds.add(link.source)
    referencedNodeIds.add(link.target)
  }

  return { nodes: nodes.filter((n) => referencedNodeIds.has(n.id)), links }
}

export async function loader() {
  const { nodes, links } = await buildGraph()
  return json({ nodes, links })
}
