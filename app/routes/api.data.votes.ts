import { Prisma } from "@prisma/client"
import { LoaderFunctionArgs, json } from "@remix-run/node"
import { db } from "~/config.server"
import { prolificRuns } from "~/lib/consts"
import { getPartyAffiliation } from "~/utils"

interface Politics {
  summary?: {
    affiliation: string
    percentage: number
  }
  counts: {
    democrat: number
    republican: number
    other: number
  }
}

export interface VoteStatistics {
  valueId: number
  votes: number
  impressions: number
  votePercentage: number
  politics?: Politics
}

function calculatePolitics(demographics: any[]): Politics | undefined {
  // Filter out votes with too little signal.
  if (demographics.length < 3) {
    return undefined
  }

  const politics = demographics.reduce(
    (acc, val) => {
      if (!val) {
        acc.counts.other++
        return acc
      }
      const aff = val.usPoliticalAffiliation.toLowerCase()
      if (aff === "republican") {
        acc.counts.republican++
      } else if (aff === "democrat") {
        acc.counts.democrat++
      } else {
        acc.counts.other++
      }
      return acc
    },
    { counts: { republican: 0, democrat: 0, other: 0 } }
  ) as Politics

  politics.summary = getPartyAffiliation(politics.counts) ?? undefined

  return politics
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const runId = url.searchParams.get("runId") ?? undefined
  const caseId = url.searchParams.get("caseId") ?? undefined

  let userFilter: Prisma.UserWhereInput = {}

  if (runId) {
    userFilter = {
      prolificId: { not: null },
      createdAt: {
        gte: (prolificRuns as any)[runId].start,
        lte: (prolificRuns as any)[runId].end,
      },
    }
  }

  const demographics = await db.demographic.findMany({
    where: { user: userFilter },
  })
  const votes = await db.vote.findMany({ where: { user: userFilter, caseId } })
  const impressions = await db.impression.findMany({
    where: { user: userFilter, caseId },
  })
  const valueIds = [...new Set(impressions.map((imp) => imp.valuesCardId))]

  // Summarize statistics.
  const statistics = valueIds.map((vid) => {
    const relevantVotes = votes.filter((vote) => vote.valuesCardId === vid)
    const relevantImpressions = impressions.filter(
      (i) => i.valuesCardId === vid
    )
    const votePercentage = relevantVotes.length / relevantImpressions.length
    const politics = calculatePolitics(relevantVotes.map((v) => demographics.find((d) => d.userId === v.userId)))

    return {
      valueId: vid,
      votes: relevantVotes.length,
      impressions: relevantImpressions.length,
      votePercentage,
      politics,
    } as VoteStatistics
  })

  // Return statistics.
  return json({ statistics })
}
