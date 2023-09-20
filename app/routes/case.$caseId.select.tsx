import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { useLoaderData, useNavigate, useParams } from "@remix-run/react"
import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { auth, db } from "~/config.server"
import ValuesCard from "~/components/values-card"
import { ChatMessage } from "~/components/chat-message"
import { useEffect, useState } from "react"
import { CanonicalValuesCard } from "@prisma/client"
import SelectionService from "~/services/selection"
import { Configuration, OpenAIApi } from "openai-edge"
import EmbeddingService from "~/services/embedding"
import { Check, Loader2 } from "lucide-react"
import StaticChatMessage from "~/components/static-chat-message"
import { cn } from "~/utils"

const minRequiredVotes = 2

export async function loader({ request, params }: LoaderArgs) {
  const userId = await auth.getUserId(request)
  const caseId = params.caseId!

  // Set up service.
  const openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  )
  const embedding = new EmbeddingService(openai, db)
  const routing = new SelectionService(openai, db, embedding)

  // Get the draw for this user.
  const { id, values } = await routing.getDraw(userId, caseId)
  console.log(`Got draw ${id} for user ${userId}`)

  return json({ values, drawId: id })
}

export async function action({ request }: ActionArgs) {
  const userId = await auth.getUserId(request)
  const body = await request.json()
  const { values, selected, drawId } = body

  console.log(
    `Submitting votes (${selected}) for user ${userId} and draw ${drawId}`
  )

  let promises = []

  // Add impressions in the database for each seen value.
  for (const card of values) {
    promises.push(
      db.impression.create({
        data: {
          valuesCardId: card.id,
          userId,
          drawId,
        },
      })
    )
  }

  // Add votes in the database for each selected value.
  for (const id of selected) {
    const value = values.find((v: CanonicalValuesCard) => v.id === id)
    const valuesCardId = value.id

    if (!value) {
      throw new Error("Vote not found in hand.")
    }

    const promise = db.vote.create({
      data: {
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
  const navigate = useNavigate()
  const { caseId } = useParams()

  const [isLoading, setIsLoading] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [selected, setSelected] = useState<number[]>([])

  const { values, drawId } = useLoaderData<typeof loader>()

  // If there are no values in the draw, continue to next step.
  useEffect(() => {
    if (values.length === 0) {
      navigate(`/case/${caseId}/link-explainer`)
    }
  }, [values])

  const onSelectValue = (id: number) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((v) => v !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  const onSubmit = async () => {
    setIsLoading(true)

    const body = { values, selected, drawId }

    const response = await fetch(`/case/${caseId}/select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      setIsLoading(false)
      const text = await response.text()
      throw new Error("Failed to submit votes: " + text)
    }

    navigate(`/case/${caseId}/link-explainer`)
  }

  if (values.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center space-y-8 py-12 mx-8">
        <StaticChatMessage
          onFinished={() => {
            setShowCards(true)
          }}
          isFinished={showCards}
          text={`Here are some examples of how others have answered. Your next task is to determine which of these values you think are wisest to consider for ChatGPT talking to the user.\n\nSelect 2 or more responses by clicking on them.`}
        />
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 mx-auto gap-4">
          {values.map((value, index) => (
            <div
              key={value.id}
              onClick={() => onSelectValue(value.id)}
              className={cn(
                "cursor-pointer transition-opacity ease-in duration-500",
                showCards
                  ? "hover:opacity-80 active:opacity-70 hover:duration-0 hover:transition-none opacity-100"
                  : "opacity-0",
                `delay-${index * 75}` // Make sure to add to `safelist` in tailwind.config.js if changed.
              )}
            >
              {selected.includes(value.id) ? (
                <SelectedValuesCard value={value as any} />
              ) : (
                <ValuesCard card={value as any} />
              )}
            </div>
          ))}
        </div>
        <div
          className={`flex flex-col justify-center items-center pt-4 transition-opacity ease-in duration-500 delay-525 ${
            showCards ? "opacity-100" : "opacity-0"
          }`}
        >
          <Button
            disabled={selected.length < minRequiredVotes || isLoading}
            onClick={() => onSubmit()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
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
