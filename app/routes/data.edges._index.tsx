import { Await, useLoaderData } from "@remix-run/react";
import { buildGraph } from "./data.edges[.]json.js"
import { Suspense } from "react";
import { defer } from "@remix-run/node";
import { MoralGraph } from "~/components/moral-graph.js";

export async function loader() {
  const graph = buildGraph()
  return defer({ graph })
}

export default function DefaultGraphPage() {
  const { graph } = useLoaderData<typeof loader>();
  return <Suspense fallback={<p>Please wait...</p>}>
    <Await resolve={graph}>{({ nodes, links }) => <MoralGraph nodes={nodes} links={links} />}</Await>
  </Suspense>
}
