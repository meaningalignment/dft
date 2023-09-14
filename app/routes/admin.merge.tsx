import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { useLoaderData } from "@remix-run/react"
import { ActionArgs, json } from "@remix-run/node"
import { auth, db } from "~/config.server"
import ValuesCard from "~/components/values-card"
import { useState } from "react"
import { CanonicalValuesCard } from "@prisma/client"
import { Check, Loader2 } from "lucide-react"
import { MemoizedReactMarkdown } from "~/components/markdown"
import { useRevalidator } from "@remix-run/react"

export async function loader({ request }: ActionArgs) {
  if ((await auth.getCurrentUser(request))?.isAdmin !== true) {
    throw new Error("Unauthorized")
  }

  const values = (await db.canonicalValuesCard.findMany({
    orderBy: {
      title: "asc",
    },
  })) as CanonicalValuesCard[]

  return json({ values })
}

export async function action({ request }: ActionArgs) {
  if ((await auth.getCurrentUser(request))?.isAdmin !== true) {
    throw new Error("Unauthorized")
  }

  const { values } = await request.json()
  const canonical = values[0]
  const duplicates = values.slice(1)

  console.log(
    `Merging ${duplicates.map((d: any) => d.id)} into ${canonical.id}`
  )

  //
  // Update the tables linked to the duplicate.
  //

  for (const duplicate of duplicates) {
    await Promise.all([
      // Update all references to the duplicate to point to the canonical.
      db.valuesCard.updateMany({
        where: { canonicalCardId: duplicate.id },
        data: { canonicalCardId: canonical.id },
      }),

      // Update all impressions of the duplicate to point to the canonical.
      db.impression.updateMany({
        where: { valuesCardId: duplicate.id },
        data: { valuesCardId: canonical.id },
      }),

      // Update all votes of the duplicate to point to the canonical.
      db.vote.updateMany({
        where: { valuesCardId: duplicate.id },
        data: { valuesCardId: canonical.id },
      }),

      // Update all edges pointing to the duplicate to point to the canonical.
      db.edge.updateMany({
        where: { toId: duplicate.id },
        data: { toId: canonical.id },
      }),

      // Update all edges pointing from the duplicate to point to the canonical.
      db.edge.updateMany({
        where: { fromId: duplicate.id },
        data: { fromId: canonical.id },
      }),

      // Update all chats with a provisional duplicate to point to the canonical.
      db.chat.updateMany({
        where: { provisionalCanonicalCardId: duplicate.id },
        data: { provisionalCanonicalCardId: canonical.id },
      }),

      // Update all edge hypotheses from the duplicate to from the canonical.
      db.edgeHypothesis.updateMany({
        where: { fromId: duplicate.id },
        data: { fromId: canonical.id },
      }),

      // Update all edge hypotheses to the duplicate to to the canonical.
      db.edgeHypothesis.updateMany({
        where: { toId: duplicate.id },
        data: { toId: canonical.id },
      }),
    ])

    console.log(`Rewired ${duplicate.id} to ${canonical.id}`)

    // Delete the duplicate, throwing an error if no record was deleted (i.e. if it is still referenced somewhere).
    await db.canonicalValuesCard.delete({
      where: {
        id: duplicate.id,
        edgesTo: { none: {} },
        edgesFrom: { none: {} },
        edgeHypothesisTo: { none: {} },
        edgeHypothesisFrom: { none: {} },
        Impression: { none: {} },
        Vote: { none: {} },
        Chat: { none: {} },
      },
    })
  }

  return json({})
}

function SelectedValuesCard({ value }: { value: CanonicalValuesCard }) {
  return (
    <div className="relative h-full w-full">
      <div className="w-full h-full border-4 border-black rounded-xl z-10 absolute pointer-events-none" />
      <div className="absolute -bottom-2 -right-2 z-20">
        <div className="bg-black h-6 w-6 rounded-full flex flex-col justify-center items-center">
          <Check strokeWidth={3} className="h-4 w-4 text-white" />
        </div>
      </div>
      <ValuesCard card={value} />
    </div>
  )
}

export default function SelectScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<CanonicalValuesCard[]>([])
  const { values } = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()

  const onMerge = async () => {
    setIsLoading(true)

    const body = {
      values: selected,
    }

    const response = await fetch(`/admin/merge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      alert("Error merging values")
    }

    alert("Values Merged")
    setSelected([])
    setIsLoading(false)
    revalidator.revalidate()
  }

  const onSelect = (s: CanonicalValuesCard) => {
    if (selected.find((c) => c.id === s.id)) {
      setSelected(selected.filter((c) => c.id !== s.id))
    } else {
      setSelected([...selected, s])
    }
  }

  const text = () => {
    return selected.length === 0
      ? "Select Values to Merge"
      : `Merge ${selected.slice(1).length} value${
          selected.slice(1).length !== 1 ? "s" : ""
        } into "${selected[0].title}"`
  }

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center space-y-8 py-12 mx-3">
        <div className="flex flex-col justify-center items-center">
          <h1 className="text-3xl text-center">
            <MemoizedReactMarkdown>
              {text().replace(/"/g, "**")}
            </MemoizedReactMarkdown>
          </h1>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-auto gap-4">
          {values.map((value) => (
            <div
              key={value.id}
              onClick={() => onSelect(value as any as CanonicalValuesCard)}
              className="cursor-pointer hover:opacity-80 active:opacity-70 hover:duration-0 hover:transition-none opacity-100"
            >
              {selected.find((s) => s.id === value.id) ? (
                <SelectedValuesCard value={value as any} />
              ) : (
                <ValuesCard card={value as any} />
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center items-center pt-4">
          <Button
            disabled={selected.length < 2 || isLoading}
            onClick={() => onMerge()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {text()}
          </Button>
        </div>
      </div>
    </div>
  )
}
