import { Prisma } from "@prisma/client"
import { LoaderArgs, json } from "@remix-run/node"
import { db } from "~/config.server"
import { prolificRuns } from "~/lib/consts"

interface Politics {
  mainAffiliation?: "republican" | "democrat" | "independent"
  republican: number
  democrat: number
  independent: number
}

interface VoteStatistics {
  valueId: number
  counts: {
    votes: number
    impressions: number
    votePercentage: number
    politics?: Politics
  }
}

function calculatePolitics(demographics: any[]): Politics | undefined {
  if (demographics.length === 0) {
    return undefined
  }

  const politics = demographics.reduce(
    (acc, val) => {
      const aff = val.usPoliticalAffiliation.toLowerCase()
      if (aff === "republican") {
        acc.republican++
      } else if (aff === "democrat") {
        acc.democrat++
      } else if (aff === "Independent") {
        acc.independent++
      }
      return acc
    },
    { republican: 0, democrat: 0, independent: 0 }
  ) as any

  if (
    politics.republican > politics.democrat &&
    politics.republican > politics.independent
  ) {
    politics.mainVoter = "republican"
  } else if (
    politics.democrat > politics.republican &&
    politics.democrat > politics.independent
  ) {
    politics.mainVoter = "democrat"
  } else if (
    politics.independent > politics.republican &&
    politics.independent > politics.democrat
  ) {
    politics.mainVoter = "independent"
  }

  return politics
}

export async function loader({ request }: LoaderArgs) {
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
    const politics = calculatePolitics(
      demographics.filter((d) =>
        relevantVotes.map((v) => v.userId).includes(d.userId)
      )
    )

    return {
      valueId: vid,
      counts: {
        votes: relevantVotes.length,
        impressions: relevantImpressions.length,
        votePercentage,
        politics,
      },
    } as VoteStatistics
  })

  // Return statistics.
  return json({ votes: statistics })
}
