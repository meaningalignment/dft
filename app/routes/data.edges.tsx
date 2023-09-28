import { Edge } from "@prisma/client";
import { json } from "@remix-run/node";
import { db } from "~/config.server";

function score(edge: Edge) {
  if (edge.relationship === 'upgrade') return 1
  if (edge.relationship === 'no_upgrade') return -1
  else return 0
}

export async function loader() {
  const nodes = await db.canonicalValuesCard.findMany({ select: { id: true, title: true } })
  const edgesFromDb = await db.edge.findMany()
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
  const edges = Object.entries(pairs).map(([k, scores]) => {
    const [fromId, toId] = k.split('-').map(Number)
    const total = scores.reduce((a, b) => a + b, 0)
    const avg = total / scores.length
    const count = scores.length
    if (avg > 0) return { fromId, toId, count, avg }
    else return { toId: fromId, fromId: toId, count, avg: -avg }
  }).filter((w) => w.count > 1)
  return json({ nodes, edges })
}
