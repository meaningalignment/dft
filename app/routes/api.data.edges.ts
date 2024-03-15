import { LoaderArgs } from "@remix-run/node"
import { prolificRuns } from "~/lib/consts"
import { Options, summarizeGraph } from "~/values-tools/generate-moral-graph"

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url)
  const caseId = url.searchParams.get("caseId")
  const runId = url.searchParams.get("runId")
  const batches = url.searchParams.get("batches")
  const includePageRank = url.searchParams.get("includePageRank")

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

  if (batches) {
    options.edgeWhere = options.edgeWhere || {}
    options.edgeWhere.user = {
      batch: { in: batches.split(",").map((x) => parseInt(x)).filter((x) => !isNaN(x)) },
    }
  }

  if (includePageRank) {
    options.includePageRank = true
  }

  return summarizeGraph(options)
}
