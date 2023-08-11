import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { Link, useLoaderData } from "@remix-run/react"
import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { auth, db } from "~/config.server"
import ValuesCard from "~/components/values-card"
import { ChatMessage } from "~/components/chat-message"
import { useRef, useState } from "react"
import { CanonicalValuesCard } from "@prisma/client"
import { IconCheck } from "~/components/ui/icons"
import SelectionRoutingService from "~/services/selection-routing"
import { v4 as uuid } from "uuid"

const routing = new SelectionRoutingService(db)

export async function loader({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)
  const values = await routing.getDraw(userId)
  return json({ values })
}

export async function action({ request }: ActionArgs) {
  const userId = await auth.getUserId(request)
  const body = await request.json()
  const { values, selected, drawId } = body

  console.log(
    `Submitting votes (${selected}) for user ${userId} and draw ${drawId}`
  )

  //
  // Add votes in the database for each selected value.
  //

  let promises = []
  for (const id of selected) {
    const value = values.find((v: CanonicalValuesCard) => v.id === id)
    const draw = values.map((v: CanonicalValuesCard) => {
      return { id: v.id, title: v.title }
    })
    const valuesCardId = value.id

    if (!value) {
      throw new Error("Vote not found in hand.")
    }

    const promise = db.vote.create({
      data: {
        draw,
        userId,
        drawId,
        valuesCardId,
      },
    })

    promises.push(promise)
  }

  await Promise.all(promises)

  return json({})
}

function SelectedValuesCard({ value }: { value: CanonicalValuesCard }) {
  return (
    <div className="relative h-full w-full">
      <div className="w-full h-full border-4 border-blue-500 rounded-xl z-10 absolute" />
      <div className="absolute -bottom-2.5 -right-2.5 z-20">
        <div className="bg-blue-500 h-8 w-8 rounded-full flex flex-col justify-center items-center">
          <IconCheck className="h-6 w-6 text-white" />
        </div>
      </div>
      <ValuesCard card={value} />
    </div>
  )
}

export default function SelectScreen() {
  const drawId = useRef(uuid()).current
  const { values } = useLoaderData<typeof loader>()
  const [selected, setSelected] = useState<number[]>([])

  const onSelectValue = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((v) => v !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  const onSubmit = async () => {
    const body = { values, selected, drawId }

    const response = await fetch("/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error("Failed to submit votes: " + text)
    }
  }

  const minRequiredVotes = values.length / 2

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center space-y-4 my-12 px-8">
        <div className="max-w-2xl">
          <ChatMessage
            message={{
              id: "1",
              role: "assistant",
              content: `Here are some examples of how others have answered. Your next task is to determine which of these values you think are wisest to consider for ChatGPT talking to the girl.\n\nSelect the responses you think are wise to consider by clicking on them.`,
            }}
            hideActions={true}
          />
        </div>
        <div className="grid xl:grid-cols-3 lg:grid-cols-2 mx-auto gap-4">
          {values.map((value) => (
            <div
              key={value.id}
              onClick={() => onSelectValue(value.id)}
              className={"cursor-pointer hover:opacity-80 active:opacity-70"}
            >
              {selected.includes(value.id) ? (
                <SelectedValuesCard value={value as any} />
              ) : (
                <ValuesCard card={value as any} />
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center items-center">
          <Button
            disabled={selected.length < minRequiredVotes}
            onClick={() => onSubmit()}
          >
            <Link to="/link">Continue</Link>
          </Button>

          <div className="flex flex-col justify-center items-center my-4 h-4">
            {selected.length < minRequiredVotes && (
              <p className="text-stone-300">
                {`Select ${minRequiredVotes - selected.length} more value${
                  selected.length === minRequiredVotes - 1 ? "" : "s"
                } to continue`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
