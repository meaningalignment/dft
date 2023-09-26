import { json, type LoaderFunctionArgs, type ActionFunctionArgs, SerializeFrom } from "@remix-run/node"
import { Form, useLoaderData, useNavigation } from "@remix-run/react"
import { CanonicalValuesCard } from "@prisma/client"
import { useRef, useState } from "react"
import { Button } from "~/components/ui/button"
import { IconSpinner } from "~/components/ui/icons"
import { Label } from "~/components/ui/label"
import ValuesCard from "~/components/values-card"
import { db } from "~/config.server"
import { runTaskFromForm, updateCardFromForm } from "~/values-tools/critique"
import { BackgroundTaskButton } from "~/components/background-task-button"
import { embeddingService } from "~/values-tools/embedding"

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
          <div className="mb-6">
            <ValuesCard key={card.id} card={card as any as CanonicalValuesCard} />
            <div className="text-sm text-neutral-500 text-center">
              Distance: {(card as any)._distance}
            </div>
          </div>
        ))
      }
    </div>
  </div>
}

function CardEditor({ card }: { card: SerializeFrom<CanonicalValuesCard> }) {
  const instructionsDetailed = useRef<HTMLTextAreaElement>(null)
  const [critique, setCritique] = useState<string | null>(null)
  const nav = useNavigation()
  return <div>
    <ValuesCard card={card as any as CanonicalValuesCard} />
    <Form method="post" className="mt-8 w-96 flex flex-col gap-4">
      <h1 className="text-3xl font-bold my-8 text-center">
        Edit your card
      </h1>
      <input type="hidden" name="cardId" value={card.id!} />
      <Label>
        <span className="text-gray-700">Title</span>
        <input
          name="title"
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
          defaultValue={card.title}
        />
      </Label>
      {/* <div className="flex items-end justify-end -mt-2 gap-2">
          <Button>
            Suggest
          </Button>
        </div> */}

      <Label>
        <span className="text-gray-700">Instructions Short</span>
        <textarea
          rows={3}
          name="instructionsShort"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
          defaultValue={card.instructionsShort}
        />
      </Label>
      <Label>
        <span className="text-gray-700">Instructions Detailed</span>
        <textarea
          ref={instructionsDetailed}
          rows={10}
          name="instructionsDetailed"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
          defaultValue={card.instructionsDetailed}
        />
      </Label>
      <div className="flex items-end justify-end -mt-2 gap-2">
        <BackgroundTaskButton task={{
          task: 'regenerateInstructionsDetailed',
          evaluationCriteria: JSON.stringify(card.evaluationCriteria)
        }}
          onData={(result) => {
            if (instructionsDetailed.current) {
              instructionsDetailed.current.value = result
            }
          }}>
          Regenerate
        </BackgroundTaskButton>
      </div>
      <Label>
        <span className="text-gray-700">Evaluation Criteria</span>
        <textarea
          rows={15}
          name="evaluationCriteria"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
          defaultValue={JSON.stringify(card.evaluationCriteria, null, 2)}
        />
      </Label>
      <div className="flex items-end justify-end -mt-2 gap-2">
        <BackgroundTaskButton
          task={{
            task: 'critiqueEvaluationCriteria',
            evaluationCriteria: JSON.stringify(card.evaluationCriteria)
          }}
          onData={(result) => setCritique(result)}
        >
          Critique
        </BackgroundTaskButton>
        {/* <Button> Improve </Button> */}
      </div>
      <Button className="mt-4" type="submit">
        {nav.state === 'submitting' ? <IconSpinner className="h-5 w-5 animate-spin mr-2" /> : null}
        Save
      </Button>
    </Form>
    {critique && (
      <div className="mt-8">
        <h1 className="text-3xl font-bold my-8 text-center">
          Critique
        </h1>
        <pre className="text-sm text-neutral-500 whitespace-pre-wrap">{critique}</pre>
      </div>
    )}
  </div>
}

export default function EditCardPage() {
  const { card, similar } = useLoaderData<typeof loader>()
  // render card, centered on the page
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <CardEditor card={card} />
      <SimilarCards similar={similar} />
    </div>
  )
}
