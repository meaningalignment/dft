import { LoaderArgs, json } from "@remix-run/node"
import { prolificRuns } from "~/lib/consts";
import { Options, summarizeGraph } from "~/values-tools/generate-moral-graph"

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  
  const options: Options = {}
  
  const runId = url.searchParams.get("runId")
  if (runId) {
    options.edgeWhere = options.edgeWhere || {}
    options.edgeWhere.user = {
      prolificId: { not: null },
      createdAt: {
        gte: (prolificRuns as any)[runId].start,
        lte: (prolificRuns as any)[runId].end,
      },
    }
  }
  
  const caseId = url.searchParams.get("caseId")
  if (caseId) {
    options.edgeWhere = options.edgeWhere || {}
    options.edgeWhere.context = {
      ContextsOnCases: { some: { caseId } },
    }
  }

  options.includeAllEdges = url.searchParams.get("includeAllEdges") === "true"
  
  const graph = await summarizeGraph(options)
  
  return json(graph)
}
