import { ActionArgs, LoaderArgs, json, redirect } from "@remix-run/node"
import { useLoaderData, useNavigate, useParams } from "@remix-run/react"
import { IconArrowRight } from "~/components/ui/icons"
import ValuesCard from "~/components/values-card"
import { CanonicalValuesCard, ValuesCard as ValuesCardType } from "@prisma/client"
import { db } from "~/config.server"
import { cn } from "~/utils"
import { Button } from "~/components/ui/button"
import { useState } from "react"

type Response = "same" | "different"
type Pair = { card: ValuesCardType, canonical: CanonicalValuesCard, response: Response | null }

function isDifferent(card: ValuesCardType, canonical: CanonicalValuesCard) {
  return card.title != canonical.title &&
    card.instructionsShort != canonical.instructionsShort &&
    card.instructionsDetailed != canonical.instructionsDetailed &&
    canonical.evaluationCriteria.join("") != card.evaluationCriteria.join("")
}

export async function loader(args: LoaderArgs) {
  const userId = parseInt(args.params.userId!)

  const pairs = (await db.valuesCard.findMany({
    where: {
      chat: { userId },
      canonicalCardId: { not: null },
      CanonicalizationVerification: { none: { userId } }
    },
    include: {
      canonicalCard: true,
      CanonicalizationVerification: true
    }
  }))
    .filter((c) => c.canonicalCard)
    .map((vc) => {
      return {
        card: vc,
        canonical: vc.canonicalCard!,
        response: vc.CanonicalizationVerification[0]?.option || null
      }
    }).filter((p) => isDifferent(p.card, p.canonical))

  return json({ pairs })
}

export async function action({ request, params }: ActionArgs) {
  const userId = parseInt(params.userId!)
  const { card, canonical, response } = (await request.json()) as Pair

  // Upsert the verification.
  await db.canonicalizationVerification.upsert({
    create: {
      canonicalCardId: canonical.id,
      valuesCardId: card.id,
      option: response!,
      userId
    },
    update: { option: response! },
    where: {
      userId_valuesCardId_canonicalCardId: {
        canonicalCardId: canonical.id,
        valuesCardId: card.id,
        userId,
      }
    }
  })

  // Redirect to link page if we're done.
  const cardsWithoutVerifications = (await db.valuesCard.findMany({
    where: {
      chat: { userId },
      canonicalCardId: { not: null },
      CanonicalizationVerification: { none: { userId } }
    },
    include: {
      canonicalCard: true,
      CanonicalizationVerification: true
    }
  }))
    .filter((c) => c.canonicalCard)
    .filter((c) => isDifferent(c, c.canonicalCard!))

  if (cardsWithoutVerifications.length === 0) {
    return redirect(`/survey/graph-position/${userId}`)
  }

  return json({})
}

function Canonicalization({ pair, onResponse: onPairResponse }: { pair: Pair, onResponse: (pair: Pair) => void }) {
  const [response, setResponse] = useState<Response | null>(pair.response)

  const onClick = (response: Response) => {
    console.log("clicked", response)
    setResponse(response)
    onPairResponse({ ...pair, response })
  }

  return (
    <div>
      <div className="w-full max-w-2xl">
      </div>
      <div
        className={cn(
          `grid grid-cols-1 md:grid-cols-3 mx-auto gap-4 items-center justify-items-center md:grid-cols-[max-content,min-content,max-content] mb-4`
        )}
      >
        <div key={pair.card.id} className="flex flex-col h-full">
          <p className="mx-8 mb-2 text-sm text-neutral-500">
            Your Value
          </p>
          <div className="flex-grow h-full w-96">
            <ValuesCard card={pair.card} />
          </div>
        </div>
        <IconArrowRight className="h-8 w-8 mx-auto rotate-90 md:rotate-0" />
        <div key={pair.canonical.id} className="flex flex-col h-full">
          <p className="mx-8 mb-2 text-sm text-neutral-500">
            Deduplicated Version
          </p>
          <div className="flex-grow h-full w-96">
            <ValuesCard card={pair.canonical} />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col items-center justify-center mt-8 mb-16 space-y-6", response ? "opacity-20" : "")}>
        <div className="text-md text-center max-w-md">Does <span className="font-bold">{pair.canonical.title}</span> represent your value?</div>
        <div className="flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center space-x-4">
            <Button onClick={() => onClick("same")} disabled={Boolean(response)} variant={response === "different" ? "ghost" : "default"}>Yes</Button>
            <Button onClick={() => onClick("different")} disabled={Boolean(response)} variant={response === "different" ? "default" : "ghost"}>No</Button>
          </div>
        </div>
      </div>

    </div>
  )
}


export default function SurveyDeduplications() {
  const { pairs } = useLoaderData<typeof loader>()
  const userId = useParams().userId!
  const navigate = useNavigate()

  const onResponse = async (pair: Pair) => {
    const response = await fetch(`/data/deduplications/${userId}`, {
      method: "POST",
      body: JSON.stringify(pair)
    })

    if (response.redirected) {
      const redirectUrl = new URL(response.url)
      const path = redirectUrl.pathname + redirectUrl.search;
      console.log(redirectUrl, path)
      navigate(path)
    }
  }

  if (!pairs.length) return (
    <div className="grid place-items-center space-y-4 py-24 px-8">
      <div className="flex flex-col items-center justify-center">
        <div className="text-3xl font-bold mb-2">No deduplications</div>
        <div className="text-xl text-center">All of your cards were used exactly as you articulated them.</div>
      </div>
    </div>
  )

  return (
    <div className="grid place-items-center space-y-8 px-8 mb-8">
      <div className="flex flex-col items-center justify-center my-8">
        <div className="text-3xl text-center font-bold mb-2 mt-12 max-w-2xl">Your cards and their deduplicated versions</div>
        <div className="text-gray-400 max-w-2xl text-center">In order to create our moral graph, we automatically deduplicate values cards submitted by participants in the background that seem to be about the same value. Please verify that the deduplicated cards below capture the values you articulated.</div>
      </div>
      {pairs.map((p) => <Canonicalization key={`${p.card.id}_${p.canonical.id}`} pair={p as any} onResponse={onResponse} />)}
    </div>
  )
}