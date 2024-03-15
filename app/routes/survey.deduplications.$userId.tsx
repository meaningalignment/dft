import { ActionArgs, LoaderArgs, json, redirect } from "@remix-run/node"
import { useLoaderData, useNavigate, useParams } from "@remix-run/react"
import { IconArrowRight } from "~/components/ui/icons"
import ValuesCard from "~/components/values-card"
import { DeduplicatedCard, ValuesCard as ValuesCardType } from "@prisma/client"
import { db } from "~/config.server"
import { cn, getDeduplicate } from "~/utils"
import { Button } from "~/components/ui/button"
import { useState } from "react"
import { generation } from "~/values-tools/deduplicator2"

type Response = "same" | "different"
type Pair = { card: ValuesCardType, deduplicate: DeduplicatedCard, response: Response | null }

function isDifferent(card: ValuesCardType, deduplicate: DeduplicatedCard) {
  return card.title != deduplicate.title &&
    card.instructionsShort != deduplicate.instructionsShort &&
    card.instructionsDetailed != deduplicate.instructionsDetailed &&
    deduplicate.evaluationCriteria.join("") != card.evaluationCriteria.join("")
}

export async function loader(args: LoaderArgs) {
  const userId = parseInt(args.params.userId!)

  const pairs = (
    await db.valuesCard.findMany({
      where: {
        chat: { userId },
        DeduplicationVerification: { none: { userId } },
        deduplications: {
          some: {
            generation,
          },
        },
      },
      include: {
        DeduplicationVerification: true,
        deduplications: {
          include: { deduplicatedCard: true },
          where: { generation },
        },
      },
    })
  )
    .map((vc) => {
      return {
        card: vc,
        deduplicate: getDeduplicate(vc),
        response: vc.DeduplicationVerification[0]?.option || null,
      }
    })
    .filter((p) => isDifferent(p.card, p.deduplicate))

  if (pairs.length === 0) {
    return redirect(`/survey/graph-position/${userId}`)
  }

  return json({ pairs })
}

export async function action({ request, params }: ActionArgs) {
  const userId = parseInt(params.userId!)
  const { card, deduplicate: deduplicate, response } = (await request.json()) as Pair

  // Upsert the verification.
  await db.deduplicationVerification.upsert({
    create: {
      deduplicatedCardId: deduplicate.id,
      valuesCardId: card.id,
      option: response!,
      userId
    },
    update: { option: response! },
    where: {
      userId_valuesCardId_deduplicatedCardId: {
        deduplicatedCardId: deduplicate.id,
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
      DeduplicationVerification: { none: { userId } }
    },
    include: {
      DeduplicationVerification: true,
      deduplications: {
        include: { deduplicatedCard: true }
      }
    }
  }))
    .filter((c) => getDeduplicate(c))
    .filter((c) => isDifferent(c, getDeduplicate(c)))

  if (cardsWithoutVerifications.length === 0) {
    return redirect(`/survey/graph-position/${userId}`)
  }

  return json({})
}

function DeduplicationView({ pair, onResponse: onPairResponse }: { pair: Pair, onResponse: (pair: Pair) => void }) {
  const [response, setResponse] = useState<Response | null>(pair.response)

  console.log(pair)

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
        <div key={pair.deduplicate.id} className="flex flex-col h-full">
          <p className="mx-8 mb-2 text-sm text-neutral-500">
            Deduplicated Version
          </p>
          <div className="flex-grow h-full w-96">
            <ValuesCard card={pair.deduplicate} />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col items-center justify-center mt-8 mb-16 space-y-6", response ? "opacity-20" : "")}>
        <div className="text-md text-center max-w-md">Does <span className="font-bold">{pair.deduplicate.title}</span> represent your value?</div>
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
    const response = await fetch(`/survey/deduplications/${userId}`, {
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

  return (
    <div className="grid place-items-center space-y-8 px-8 mb-8">
      <div className="flex flex-col items-center justify-center my-8">
        <div className="text-3xl text-center font-bold mb-2 mt-12 max-w-2xl">Your cards and their deduplicated versions</div>
        <div className="text-gray-400 max-w-2xl text-center">In order to create our moral graph, we automatically deduplicate values cards submitted by participants in the background that seem to be about the same value. Please verify that the deduplicated cards below capture the values you articulated.</div>
      </div>
      {pairs.map((p) => <DeduplicationView key={`${p.card.id}_${p.deduplicate.id}`} pair={p as any} onResponse={onResponse} />)}
    </div>
  )
}