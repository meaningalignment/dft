import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { LoaderArgs, json } from "@remix-run/node"
import { auth, db } from "~/config.server"
import { ChatMessage } from "~/components/chat-message"
import ValuesCard from "~/components/values-card"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import LinkRoutingService from "~/services/linking-routing"
import { Configuration, OpenAIApi } from "openai-edge"
import EmbeddingService from "~/services/embedding"

export async function loader({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)

  const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  const openai = new OpenAIApi(config)
  const embedding = new EmbeddingService(openai, db)
  const service = new LinkRoutingService(openai, db, embedding)

  const draw = await service.getDraw(userId)

  return json({ draw })
}

export async function action({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)
  const body = await request.json()
  const { values, selected } = body

  console.log(
    `Submitting lesser values ${selected} for more comprehensive value ${values.to.id}`
  )

  // Add the edges in the database.
  await Promise.all(
    selected.map((id: number) =>
      db.edge.create({
        data: {
          fromId: id,
          toId: values.to.id,
          userId,
        },
      })
    )
  )

  return json({})
}

export default function LinkScreen() {
  const navigate = useNavigate()
  const { draw } = useLoaderData<typeof loader>()
  const [index, setIndex] = useState<number>(0)
  const [selectedLesserValues, setSelectedLesserValues] = useState<number[]>([])

  // If there are no values in the draw, continue to next step.
  useEffect(() => {
    if (draw.length === 0) {
      navigate("/finished")
    }
  }, [draw])

  const onSubmit = async () => {
    const body = { values: draw[index], selected: selectedLesserValues }

    // Post the relationship to the server in the background,
    // and reset in case it fails.
    const response = await fetch("/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.json()
      console.error(text)
      toast.error("Failed to submit relationship. Please try again.")
      return
    }

    // If we're at the end of the draw, navigate to the finish screen.
    if (index === draw.length - 1) {
      return navigate("/finished")
    }

    // Move to the next pair.
    setIndex((i) => i + 1)
    setSelectedLesserValues([])
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
              content: `If ChatGPT follows only the top value, will it automatically be following some of the lower ones?\n\nOnce ChatGPT has the top value, some of the lower values can be left out, if the top one includes what they're really about.\n\nSelect the lower values that can be left out.`,
            }}
            hideActions={true}
          />
        </div>
        <div className="mx-auto">
          <ValuesCard card={draw[index].to as any} />
        </div>
        <div className="grid md:grid-cols-2 mx-auto gap-4">
          {draw[index].from.map((value, idx) => (
            <div
              style={{
                opacity: selectedLesserValues.includes(value.id) ? 0.5 : 1,
              }}
              className={"transition-opacity"}
              key={value.id}
            >
              <ValuesCard card={value as any} />
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-center items-center">
          <Button
            disabled={selectedLesserValues.length === 0}
            onClick={() => onSubmit()}
          >
            {draw.length - index === 1 ? "Finish" : "Continue"}
          </Button>
        </div>
        <div className="flex flex-col justify-center items-center my-4 h-4">
          <p className="text-stone-300">
            {`Submit ${draw.length - index} more relationship${
              draw.length - index === 1 ? "" : "s"
            } to finish`}
          </p>
        </div>
      </div>
    </div>
  )
}
