import { LoaderArgs, json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { IconArrowRight } from "~/components/ui/icons"
import ValuesCard from "~/components/values-card"
import { CanonicalValuesCard, ValuesCard as ValuesCardType } from "@prisma/client"
import { db } from "~/config.server"
import { cn } from "~/utils"

function isDifferent(card: ValuesCardType, canonical: CanonicalValuesCard) {
  return card.title != canonical.title &&
    card.instructionsShort != canonical.instructionsShort &&
    card.instructionsDetailed != canonical.instructionsDetailed &&
    canonical.evaluationCriteria.join("") != card.evaluationCriteria.join("")
}

export async function loader(args: LoaderArgs) {
  const userId = parseInt(args.params.userId!)

  const values = await db.valuesCard.findMany({ where: { chat: { userId } } })
  const canonical = await db.canonicalValuesCard.findMany({
    where: {
      id: {
        in: values.filter((v) => v.canonicalCardId).map((v) => v.canonicalCardId!)
      }
    }
  }) as CanonicalValuesCard[]

  const pairs = values.map((v) => {
    return {
      card: v,
      canonical: canonical.find((c) => c.id === v.canonicalCardId)!
    }
  }).filter((vp) => isDifferent(vp.card, vp.canonical))

  return json({ pairs })
}

function Canonicalization({ card, canonical }: { card: ValuesCardType, canonical: CanonicalValuesCard }) {
  return (
    <div>
      <div className="w-full max-w-2xl">
      </div>
      <div
        className={cn(
          `grid grid-cols-1 md:grid-cols-3 mx-auto gap-4 items-center justify-items-center md:grid-cols-[max-content,min-content,max-content] mb-4`
        )}
      >
        <div key={card.id} className="flex flex-col h-full">
          <p className="mx-8 mb-2 text-sm text-neutral-500">
            Your Value
          </p>
          <div className="flex-grow h-full w-96">
            <ValuesCard card={card} />
          </div>
        </div>
        <IconArrowRight className="h-8 w-8 mx-auto rotate-90 md:rotate-0" />
        <div key={card.id} className="flex flex-col h-full">
          <p className="mx-8 mb-2 text-sm text-neutral-500">
            Deduplicated Version
          </p>
          <div className="flex-grow h-full w-96">
            <ValuesCard card={canonical} />
          </div>
        </div>
      </div>
    </div>
  )
}


export default function AdminLink() {
  const { pairs } = useLoaderData<typeof loader>()

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
        <div className="text-3xl font-bold mb-2 mt-12 max-w-2xl">Your cards and their deduplicated versions</div>
        <div className="text-gray-400 max-w-2xl text-center">In order to create our moral graph, we automatically deduplicate values cards submitted by participants in the background that seem to be about the same value. Please verify that the deduplicated cards below capture the values you articulated.</div>
      </div>
      {pairs.map((p) => <Canonicalization key={`${p.card.id} +${p.canonical.id}`} card={p.card as any} canonical={p.canonical as any} />)}
    </div>
  )
}
