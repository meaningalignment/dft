import { LoaderArgs, json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import ValuesCard from "~/components/values-card"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const caseId = params.caseId! as string

  const values = await db.canonicalValuesCard.findMany({
    where: { Vote: { some: { caseId } }, Impression: { some: { caseId } } },
    include: {
      Vote: {
        where: { caseId },
      },
      Impression: {
        where: { caseId },
      },
    },
  })

  return json({
    values: values.sort((a, b) => {
      return b.Vote.length - a.Vote.length
    }),
  })
}

function StatsBadge({
  votes,
  impressions,
}: {
  votes: number
  impressions: number
}) {
  return (
    <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 rounded-full py-1 px-2 text-xs">
      {votes} votes | {impressions} views
    </div>
  )
}

export default function AdminCaseVotes() {
  const { values } = useLoaderData<typeof loader>()

  return (
    <div className="grid place-items-center space-y-4 py-12 px-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-auto gap-4">
        {values.map((value) => (
          <div className="relative h-full w-full" key={value.id}>
            <div className="absolute bottom-10 right-6 z-20 w-full">
              <StatsBadge
                votes={value.Vote.length}
                impressions={value.Impression.length}
              />
            </div>
            <ValuesCard card={value as any} />
          </div>
        ))}
      </div>
    </div>
  )
}
