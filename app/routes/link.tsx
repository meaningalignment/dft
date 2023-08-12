import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { useLoaderData } from "@remix-run/react"
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
import { useState } from "react"

export async function loader({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)
  const values = (await db.canonicalValuesCard.findMany({
    take: 2,
  })) as CanonicalValuesCard[]

  const edges = (await db.edge.findMany({ where: { userId } })) as Edge[]

  return json({ values, edges })
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

type Relationship =
  | "a_more_comprehensive"
  | "b_more_comprehensive"
  | "incommensurable"
  | "dont_know"

export default function LinkScreen() {
  const { values, edges } = useLoaderData<typeof loader>()
  const [relationship, setRelationship] = useState<Relationship | null>(null)

  const onSubmit = async () => {
    const body = { values, relationship }

    const response = await fetch("/api/relationship", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.json()
      throw new Error("Failed to submit relationship: " + text)
    }

    // Reload page.
    window.location.reload()
  }

  const isMoreComprehensive = (card: CanonicalValuesCard) => {
    if (values[0].id === card.id) {
      return relationship === "a_more_comprehensive"
    }

    if (values[1].id === card.id) {
      return relationship === "b_more_comprehensive"
    }

    return false
  }

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
          {values.map((value, idx) => (
            <div
              style={{
                opacity:
                  relationship !== null &&
                  relationship !== "incommensurable" &&
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
            onValueChange={(value: Relationship) => setRelationship(value)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="a_more_comprehensive" id="1" />
              <Label htmlFor="r1">It is enough to only consider A</Label>
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

          <Button disabled={relationship === null} onClick={() => onSubmit()}>
            Continue
          </Button>
        </div>
        <div className="flex flex-col justify-center items-center my-4 h-4">
          {edges.length < 5 && (
            <p className="text-stone-300">
              {`Submit ${5 - edges.length} more relationship${
                edges.length === 4 ? "" : "s"
              } to finish`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
