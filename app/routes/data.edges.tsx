import { Await, useLoaderData } from "@remix-run/react";
import { defer } from '@remix-run/node';
import { Graph } from "~/components/moral-graph";
import { buildGraph } from "./data.edges[.]json";
import { Suspense } from "react";

export async function loader() {
  const graph = buildGraph()
  return defer({ graph })
}

export default function GraphPage() {
  const { graph } = useLoaderData<typeof loader>();
  return <Suspense fallback={<p>Please wait...</p>}>
    <Await resolve={graph}>{({ nodes, links }) => <Graph nodes={nodes} links={links} />}</Await>
  </Suspense>
}
