import { LoaderArgs } from "@remix-run/node"
import { prolificRuns } from "~/lib/consts"
import { Options, summarizeGraph } from "~/values-tools/generate-moral-graph"

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url)
  const caseId = url.searchParams.get("caseId")
  const runId = url.searchParams.get("runId")

  const options: Options = {}

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

  if (caseId) {
    options.edgeWhere = options.edgeWhere || {}
    options.edgeWhere.context = {
      ContextsOnCases: { some: { caseId } },
    }
  }

  return summarizeGraph(options)
}
