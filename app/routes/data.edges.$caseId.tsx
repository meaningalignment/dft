import { LoaderArgs, defer } from "@remix-run/node"
import { buildGraph } from "./data.edges[.]json.js"
import { Suspense } from "react"
import { Await, useLoaderData } from "@remix-run/react"
import { MoralGraph } from "~/components/moral-graph"

export async function loader({ params }: LoaderArgs) {
  const caseId = params.caseId!
  const graph = buildGraph(caseId)
  return defer({ graph })
}

export default function DefaultGraphPage() {
  const { graph } = useLoaderData<typeof loader>();
  return <Suspense fallback={<p>Please wait...</p>}>
    <Await resolve={graph}>{({ nodes, links }) => <MoralGraph nodes={nodes} links={links} />}</Await>
  </Suspense>
}
