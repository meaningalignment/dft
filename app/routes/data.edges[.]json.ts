import { LoaderArgs, json } from "@remix-run/node"
import { summarizeGraph } from "~/values-tools/generate-moral-graph"

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  console.log('params', url.searchParams)
  const graph = await summarizeGraph({ includeAllEdges: url.searchParams.get("includeAllEdges") === "true" })
  return json(graph)
}
