import { Await, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { defer } from '@remix-run/node';
import { Graph } from "~/components/moral-graph";
import { buildGraph } from "./data.edges[.]json";

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
