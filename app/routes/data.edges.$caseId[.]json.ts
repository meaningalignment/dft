import { LoaderArgs, json } from "@remix-run/node"
import { buildGraph } from "./data.edges[.]json"

export async function loader({ params }: LoaderArgs) {
  const caseId = params.caseId!
  const { nodes, links } = await buildGraph(caseId)
  return json({ nodes, links })
}
