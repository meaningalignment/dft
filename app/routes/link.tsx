import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { useLoaderData, useNavigate, useRevalidator } from "@remix-run/react"
import { LoaderArgs, json } from "@remix-run/node"
import { auth, db } from "~/config.server"
import { ChatMessage } from "~/components/chat-message"
import ValuesCard from "~/components/values-card"
import {
  CanonicalValuesCard,
  Edge,
  Relationship as RelationshipType,
} from "@prisma/client"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Label } from "~/components/ui/label"
import { useEffect, useState } from "react"
import { splitToPairs } from "~/utils"
import toast from "react-hot-toast"

type ValuesPair = [CanonicalValuesCard, CanonicalValuesCard]

type Relationship =
  | "a_more_comprehensive"
  | "b_more_comprehensive"
  | "incommensurable"
  | "dont_know"

export async function loader({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)

  // Get 10 values (2 per draw, 5 draws) that have not been
  // linked together by the user yet.
  const values = (await db.canonicalValuesCard.findMany({
    take: 10,
    where: {
      edgesFrom: { none: { userId } },
      edgesTo: { none: { userId } },
    },
  })) as CanonicalValuesCard[]

  const draw: ValuesPair[] = splitToPairs(values).map((p) => p as ValuesPair)

  console.log(
    `Got linking draw: ${draw.map(
      (p) => p[0].id.toString() + ", " + p[1].id
    )} for user: ${userId}`
  )

  return json({ draw })
}

export async function action({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)
  const body = await request.json()
  const { values, relationship } = body

  console.log(`Submitting relationship ${relationship} for ${values}`)

  //
  // Add the relationship in the database.
  //

  const [a, b] = values
  let [from, to]: CanonicalValuesCard[] = values
  let relationshipType: RelationshipType

  if (relationship === "a_more_comprehensive") {
    from = b
    to = a
    relationshipType = RelationshipType.more_comprehensive
  } else if (relationship === "b_more_comprehensive") {
    from = a
    to = b
    relationshipType = RelationshipType.more_comprehensive
  } else if (relationship === "incommensurable") {
    relationshipType = RelationshipType.incommensurable
  } else if (relationship === "dont_know") {
    relationshipType = RelationshipType.dont_know
  } else {
    throw new Error(`Invalid relationship: ${relationship}`)
  }

  await db.edge.create({
    data: {
      userId,
      fromValueId: from.id,
      toValueId: to.id,
      relationship: relationshipType,
    },
  })

  return json({})
}

export default function LinkScreen() {
  const navigate = useNavigate()
  const { draw } = useLoaderData<typeof loader>()
  const [currentPairIndex, setCurrentPairIndex] = useState<number>(0)
  const [currentRelationship, setCurrentRelationship] =
    useState<Relationship | null>(null)

  // If there are no values in the draw, continue to next step.
  useEffect(() => {
    if (draw.length === 0) {
      navigate("/finished")
    }
  }, [draw])

  const onSubmit = async () => {
    const index = currentPairIndex
    const body = { values: draw[index], relationship: currentRelationship }

    // Post the relationship to the server in the background,
    // and reset in case it fails.
    fetch("/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then(async (response) => {
      if (!response.ok) {
        toast.error("Failed to submit relationship.")

        // Reset.
        setCurrentPairIndex(index)
        setCurrentRelationship(null)

        const text = await response.json()
        console.error(text)
      }
    })

    // If we're at the end of the draw, navigate to the finish screen.
    if (index === draw.length - 1) {
      return navigate("/finished")
    }

    console.log("Updating!")

    // Move to the next pair.
    setCurrentPairIndex((i) => i + 1)
    setCurrentRelationship(null)
  }

  const isMoreComprehensive = (card: CanonicalValuesCard) => {
    const [a, b] = draw[currentPairIndex]
    if (a.id === card.id) {
      return currentRelationship === "a_more_comprehensive"
    }

    if (b.id === card.id) {
      return currentRelationship === "b_more_comprehensive"
    }

    return false
  }

  console.log(currentRelationship)

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center space-y-4 my-12 px-8">
        <div className="max-w-2xl">
          <ChatMessage
            message={{
              id: "1",
              role: "assistant",
              content: `Here are two values ChatGPT could consider in forming its response.\n\nCertain values include all of the important aspects of other values. If this is the case, it would be enough for ChatGPT to only consider one of these values. Is this the case with the values below? Or are they both important in unique ways?\n\nYour next task is to determine the relationship between 5 value pairs.`,
            }}
            hideActions={true}
          />
        </div>
        <div className="grid md:grid-cols-2 mx-auto gap-4">
          {draw[currentPairIndex]?.map((value, idx) => (
            <div
              style={{
                opacity:
                  currentRelationship !== null &&
                  currentRelationship !== "incommensurable" &&
                  !isMoreComprehensive(value as any)
                    ? 0.5
                    : 1,
              }}
              className={"transition-opacity"}
              key={value.id}
            >
              <ValuesCard
                card={value as any}
                header={
                  <h1 className="font-bold text-2xl mb-2">
                    {idx === 0 ? "A" : "B"}
                  </h1>
                }
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-center items-center">
          <RadioGroup
            className="mb-12"
            value={currentRelationship || "undefined"}
            onValueChange={(r: Relationship) => setCurrentRelationship(r)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="a_more_comprehensive" id="1" />
              <Label htmlFor="1">It is enough to only consider A</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="b_more_comprehensive" id="2" />
              <Label htmlFor="2">It is enough to only consider B</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="incommensurable" id="3" />
              <Label htmlFor="3">They are both important in unique ways</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dont_know" id="4" />
              <Label htmlFor="4">I don't know</Label>
            </div>
          </RadioGroup>

          <Button
            disabled={currentRelationship === null}
            onClick={() => onSubmit()}
          >
            {draw.length - currentPairIndex === 1 ? "Finish" : "Continue"}
          </Button>
        </div>
        <div className="flex flex-col justify-center items-center my-4 h-4">
          <p className="text-stone-300">
            {`Submit ${draw.length - currentPairIndex} more relationship${
              draw.length - currentPairIndex === 1 ? "" : "s"
            } to finish`}
          </p>
        </div>
      </div>
    </div>
  )
}
