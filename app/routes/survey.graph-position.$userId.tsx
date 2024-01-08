import { ActionArgs, LoaderArgs, json, redirect } from "@remix-run/node"
import { Link, useLoaderData, useNavigate, useParams } from "@remix-run/react"
import { IconArrowRight } from "~/components/ui/icons"
import ValuesCard from "~/components/values-card"
import { db } from "~/config.server"
import { cn } from "~/utils"
import { Button } from "~/components/ui/button"
import { useEffect, useState } from "react"
import { Loader2, Truck } from "lucide-react"
import React from "react"
import { EdgeStats, MoralGraphSummary } from "~/values-tools/moral-graph-summary"

interface Value {
  id: number
  title: string
  instructionsShort: string
  instructionsDetailed: string
  evaluationCriteria: string[]
}

function LoadingScreen() {
  return <div className="h-screen w-full mx-auto flex items-center justify-center">
    <Loader2 className="h-4 w-4 animate-spin" />
  </div>
}

export async function loader(args: LoaderArgs) {
  const userId = parseInt(args.params.userId!)

  const card = (await db.valuesCard.findFirst({
    where: {
      chat: { userId },
      canonicalCardId: { not: null },
    },
    include: {
      chat: true,
      canonicalCard: true,
    }
  }))

  if (!card) {
    return redirect(`/data/deduplication-thanks`) // TODO
  }

  return json({ canonical: card.canonicalCard, original: card, caseId: card.chat.caseId })
}

export async function action(args: ActionArgs) {
  const userId = parseInt(args.params.userId!)
  const { value, original, isFair } = (await args.request.json()) as { value: Value, original: { id: number }, isFair: boolean }

  await db.followUpResponse.upsert({
    create: {
      canonicalCardId: value.id,
      valuesCardId: original.id,
      isSatisfiedWithPosition: isFair,
      userId
    },
    update: { isSatisfiedWithPosition: isFair },
    where: {
      userId_valuesCardId_canonicalCardId: {
        canonicalCardId: value.id,
        valuesCardId: original.id,
        userId,
      }
    }
  })

  return redirect(`/survey/thanks/${userId}`)
}

interface TripletData {
  from?: Value
  fromEdge?: EdgeStats
  userValue: Value
  to?: Value
  toEdge?: EdgeStats
}

function Triplet({ triplet, onResponse }: { triplet: TripletData, onResponse: (agree: boolean) => void }) {
  return (
    <div>
      <div className="w-full max-w-2xl">
      </div>
      <div
        className={cn(
          `flex flex-row mx-auto gap-4 items-center justify-items-center mb-4`
        )}
      >
        {triplet.from && (
          <React.Fragment key={triplet.from.id}>
            <div className="flex flex-col h-full">
              <p className="mx-8 mb-2 text-sm text-neutral-500">
                {triplet.fromEdge?.counts.markedWiser} people voted "less wise" than your value
              </p>
              <div className="flex-grow h-full w-96">
                <ValuesCard card={triplet.from as any} />
              </div>
            </div>
            <IconArrowRight className="h-8 w-8 mx-auto rotate-90 md:rotate-0" />
          </React.Fragment>
        )
        }


        <div className="flex flex-col h-full">
          <p className="mx-8 mb-2 text-sm text-neutral-500">
            Your Value
          </p>
          <div className="flex-grow h-full w-96">
            <div className="relative h-full w-full">
              <div className="w-full h-full border-4 border-black rounded-xl z-10 absolute pointer-events-none" />
              <ValuesCard card={triplet.userValue as any} />
            </div>
          </div>
        </div>


        {triplet.to && (
          <React.Fragment key={triplet.to.id}>
            <IconArrowRight className="h-8 w-8 mx-auto rotate-90 md:rotate-0" />

            <div className="flex flex-col h-full">
              <p className="mx-8 mb-2 text-sm text-neutral-500">
                {triplet.fromEdge?.counts.markedWiser} people voted "wiser" than your value
              </p>
              <div className="flex-grow h-full w-96">
                <ValuesCard card={triplet.to as any} />
              </div>
            </div>
          </React.Fragment>
        )
        }
      </div>

      <div className={cn("flex flex-col items-center justify-center mt-8 mb-16 space-y-6")}>
        <div className="text-md text-center max-w-md">Do you think your value ended up in a fair position?</div>
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center space-x-4">
            <Button onClick={() => onResponse(true)}>Yes</Button>
            <Button onClick={() => onResponse(false)} variant="ghost">No</Button>
          </div>
        </div>
      </div>

    </div>
  )
}


export default function SurveyGraphPosition() {
  const [triplet, setTriplet] = useState<TripletData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { canonical, original, caseId } = useLoaderData<typeof loader>()
  const userId = useParams().userId!
  const navigate = useNavigate()


  useEffect(() => {
    setIsLoading(true)
    if (!triplet && !isLoading) {
      setupTriplet()
    }
  }, [])

  const setupTriplet = async () => {
    setIsLoading(true)

    const headers = { "Content-Type": "application/json" }
    const params = { caseId }

    // Fetch the graph.
    const graph: MoralGraphSummary = await fetch("/api/data/edges?" + new URLSearchParams(params).toString(), { headers }).then((res) => res.json())

    // Create the triplet from the graph.
    const fromEdge = graph.edges.find((e) => e.wiserValueId === canonical!.id)
    const from = graph.values.find((n) => fromEdge?.sourceValueId === n.id)
    const toEdge = graph.edges.find((e) => e.sourceValueId === canonical!.id)
    const to = graph.values.find((n) => toEdge?.wiserValueId === n.id)

    // Set the triplet.
    setTriplet({
      from,
      fromEdge,
      userValue: canonical!,
      to,
      toEdge
    })

    setIsLoading(false)
  }

  const onResponse = async (isFair: boolean) => {
    const response = await fetch(`/survey/graph-position/${userId}`, {
      method: "POST",
      body: JSON.stringify({ canonical, original, isFair })
    })

    if (response.redirected) {
      const redirectUrl = new URL(response.url)
      const path = redirectUrl.pathname + redirectUrl.search;
      navigate(path)
    }
  }

  const description = () => {
    // Try find intersecting contexts between the edges.
    const intersect = triplet?.fromEdge?.contexts.filter((c) => triplet?.toEdge?.contexts.includes(c))

    // Use the intersecting context in the description.
    if (intersect?.length) {
      return `Here is where your value ended up in the moral graph, for ${intersect[0].toLowerCase()}.`
    }

    // Otherwise, use the case as the context in the description.
    const when = caseId === 'abortion' ? 'when helping a Christian girl considering an abortion' : caseId === 'parenting' ? 'when helping a parent with an unruly child' : 'when someone asks for potentially dangerous information'
    return `Here is where your value ended up in the moral graph, for ${when}.`
  }

  if (isLoading || !triplet) return <LoadingScreen />

  return (
    <div className="grid place-items-center space-y-8 px-8 mb-8">
      <div className="flex flex-col items-center justify-center my-8">
        <div className="text-3xl text-center font-bold mb-2 mt-12 max-w-2xl">Your value and its neighbours</div>
        <div className="text-gray-400 max-w-2xl text-center">{description()}</div>
      </div>
      <Triplet triplet={triplet} onResponse={onResponse} />

      <div className="flex flex-col justify-center items-center my-4 h-4">

        <p
          className={cn(
            "px-2 text-center text-xs leading-normal text-muted-foreground",

          )}

        >
          Explore the full{" "}
          <Link className="underline" to="/data/edges">
            Moral Graph
          </Link>
          .
        </p>
      </div>
    </div>
  )
}