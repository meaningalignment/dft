import { Await, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { defer, json } from '@remix-run/node';
import { Edge } from "@prisma/client";
import { db } from "~/config.server";
import { Graph } from "~/components/moral-graph.client";

export const config = {
  maxDuration: 300
}

function score(edge: Edge) {
  if (edge.relationship === "upgrade") return 1
  if (edge.relationship === "no_upgrade") return -0.2
  else return 0
}

async function buildGraph() {
  const nodes = await db.canonicalValuesCard.findMany()
  const referencedNodeIds = new Set<number>()
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
  const graph = buildGraph()
  return defer({ graph })
}

let isHydrating = true;

export default function GraphPage() {
  const { graph } = useLoaderData<typeof loader>();
  const [isHydrated, setIsHydrated] = useState(!isHydrating)
  useEffect(() => {
    isHydrating = false;
    setIsHydrated(true);
  }, [])

  if (!isHydrated) return <p>Please wait...</p>
  return <Await resolve={graph}>{({ nodes, links }) => <Graph nodes={nodes} links={links} />}</Await>
}
