
import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { buildGraph } from './data.edges[.]json.js'
import { json } from '@remix-run/node';
import { Graph } from "~/components/moral-graph.client"

export const config = {
  maxDuration: 300
}

export async function loader() {
  const { nodes, links } = await buildGraph()
  return json({ nodes, links })
}

let isHydrating = true;

export default function GraphPage() {
  const { nodes, links } = useLoaderData<typeof loader>();
  const [isHydrated, setIsHydrated] = useState(!isHydrating)
  useEffect(() => {
    isHydrating = false;
    setIsHydrated(true);
  }, [])

  if (!isHydrated) return <p>Please wait...</p>
  return <p>Hydrated</p>
}
