import { LoaderArgs } from "@remix-run/node"
import { Options, summarizeGraph } from "~/values-tools/generate-moral-graph"

const prolificRuns = {
  prolific_50: {
    start: new Date("Sep 21, 2023 18:00:00 UTC"),
    end: new Date("Sep 21, 2023 20:00:00 UTC"),
  },
  prolific_125: {
    start: new Date("Oct 10, 2023 09:00:00 UTC"),
    end: new Date("Oct 10, 2023 14:30:00 UTC"),
  },
  prolific_325: {
    start: new Date("Oct 6, 2023 14:00:00 UTC"),
    end: new Date("Oct 9, 2023 23:00:00 UTC"),
  },
}

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
