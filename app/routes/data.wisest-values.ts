import { json } from "@remix-run/node"
import { summarizeGraph } from "~/values-tools/generate-moral-graph"
import { MoralGraphSummary } from "~/values-tools/moral-graph-summary";

type WiseValue = MoralGraphSummary["values"][0] & { wisdom: number }

export async function loader() {
  const { edges, values } = await summarizeGraph({
    includeAllEdges: true
  })

  edges.forEach((link) => {
    const t = values.find((node) => node.id === link.wiserValueId) as WiseValue | undefined
    if (t) {
      if (!t.wisdom) t.wisdom = link.summary.wiserLikelihood
      else t.wisdom += link.summary.wiserLikelihood
    }
  })

  const sorted = (values as WiseValue[]).sort((a, b) => {
    if (!a.wisdom) return 1
    if (!b.wisdom) return -1
    return b.wisdom - a.wisdom
  }).filter((v) => v.wisdom > 1).map((v) => ({
    id: v.id,
    title: v.title,
    attentionalPolicies: v.evaluationCriteria
  }))

  return json(sorted)
}
