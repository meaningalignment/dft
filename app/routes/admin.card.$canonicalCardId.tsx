import { json, type LoaderFunctionArgs, type ActionFunctionArgs, SerializeFrom } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import { CanonicalValuesCard } from "@prisma/client"
import ValuesCard from "~/components/values-card"
import { db } from "~/config.server"
import { runTaskFromForm, updateCardFromForm } from "~/values-tools/critique"
import { embeddingService } from "~/values-tools/embedding"
import { ValuesCardEditor } from "~/components/values-card-editor"

export async function loader({ params }: LoaderFunctionArgs) {
  const card = await db.canonicalValuesCard.findUniqueOrThrow({
    where: { id: Number(params.canonicalCardId) },
  })
  if (!card) throw new Error("Card not found")
  const similar = await embeddingService.getSimilarCards(card)
  return json({ card, similar })
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("action") as string
  if (!action) {
    await updateCardFromForm(formData)
    return null
  } else if (action === 'task') {
    return await runTaskFromForm(formData)
  } else {
    return json({ error: "Unknown action" }, { status: 400 })
  }
}

function SimilarCards({ similar }: { similar: SerializeFrom<CanonicalValuesCard[]> }) {
  return <div><h1 className="text-3xl font-bold my-8 text-center">
    Similar cards
  </h1>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-auto gap-4">
      {
        similar.map((card) => (
          <Link to={`/admin/card/${card.id}`} className="mb-6">
            <ValuesCard key={card.id} card={card as any as CanonicalValuesCard} />
            <div className="text-sm text-neutral-500 text-center">
              Distance: {(card as any)._distance}
            </div>
          </Link>
        ))
      }
    </div>
  </div>
}

export default function EditCardPage() {
  const { card, similar } = useLoaderData<typeof loader>()
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <ValuesCardEditor card={card} cardType="canonical" />
      <SimilarCards similar={similar} />
    </div>
  )
}
