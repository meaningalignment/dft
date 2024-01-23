import { CanonicalValuesCard } from "@prisma/client"
import { SerializeFrom } from "@remix-run/node"
import { useNavigation, Form } from "@remix-run/react"
import { useRef, useState } from "react"
import { BackgroundTaskButton } from "./background-task-button"
import { Button } from "./ui/button"
import { IconSpinner } from "./ui/icons"
import { Label } from "./ui/label"
import ValuesCard from "./values-card"

export function ValuesCardEditor({ card, cardType }: { card: SerializeFrom<CanonicalValuesCard>, cardType: 'canonical' | 'personal' }) {
  const instructionsDetailed = useRef<HTMLTextAreaElement>(null)
  const [critique, setCritique] = useState<string | null>(null)
  const [titleIdeas, setTitleIdeas] = useState<string[] | null>(null)
  const nav = useNavigation()
  return <div key={card.id}>
    <ValuesCard inlineDetails card={card as any as CanonicalValuesCard} />
    <Form method="post" className="mt-8 w-96 flex flex-col gap-4">
      <h1 className="text-3xl font-bold my-8 text-center">
        Edit your card
      </h1>
      <input type="hidden" name="cardId" value={card.id!} />
      <input type="hidden" name="cardType" value={cardType} />
      <Label>
        <span className="text-gray-700">Title</span>
        <input
          name="title"
          type="text"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-2 py-1.5 text-sm"
          defaultValue={card.title}
        />
      </Label>
      <div className="flex items-end justify-end -mt-2 gap-2">
        <BackgroundTaskButton task={{
          task: 'generateTitles',
          evaluationCriteria: JSON.stringify(card.evaluationCriteria)
        }}
          onData={(result) => setTitleIdeas(result)}>
          Suggest
        </BackgroundTaskButton>
      </div>
      {titleIdeas ? (
        <div className="text-sm text-neutral-500 text-center">{titleIdeas}</div>
      ) : null}

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
      <div className="flex items-end justify-end gap-2">
        <BackgroundTaskButton
          task={{
            task: 'reembed',
            cardId: card.id!
          }}
          onData={() => alert('done!')}
        >
          Re-embed
        </BackgroundTaskButton>
        <Button className="mt-4" type="submit">
          {nav.state === 'submitting' ? <IconSpinner className="h-5 w-5 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
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
