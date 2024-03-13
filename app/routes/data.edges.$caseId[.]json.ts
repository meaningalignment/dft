import { LoaderFunctionArgs, json } from "@remix-run/node"
import { summarizeGraph } from "~/values-tools/generate-moral-graph"

export async function loader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId!
  const graph = await summarizeGraph(({
    edgeWhere: {
      context: {
        ContextsOnCases: { some: { caseId } }
      }
    }
  }))
  return json(graph)
}
