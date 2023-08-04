import { ValuesCardCandidate } from "~/lib/consts"
import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { useState } from "react"

type Props = {
  card: ValuesCardCandidate
  onSubmit: (card: ValuesCardCandidate) => void
  isFinished: boolean
}

export default function ValuesCard({ card, onSubmit, isFinished }: Props) {
  const [isSubmitted, setIsSubmitted] = useState(false)

  return (
    <div className="my-8 border-2 border-border rounded-xl px-8 pt-8 pb-4 max-w-[420px]">
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructions_short}</p>
      <p className="text-sm pt-2 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructions_detailed}</p>
      <div className="w-full flex flex-row mt-4 items-baseline">
        <Dialog>
          <DialogTrigger asChild>
            <a href="#" className="text-sm text-blue-400 hover:underline">
              More Details
            </a>
          </DialogTrigger>
          <DialogContent className="sm:max-w-fit md:max-w-xl">
            <DialogHeader>
              <DialogTitle>Details</DialogTitle>
              <DialogDescription>
                ChatGPT will be considered successful if, in dialogue with the user, the following kinds of things were surfaced or enabled:
              </DialogDescription>
            </DialogHeader>
            <div className="flex space-y-1 flex-col overflow-auto">
              {card.evaluation_criteria?.map((criterion, id) => (
                <li key={id} className="text-sm text-neutral-500">{criterion}</li>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex-grow" />
        <Button
          onClick={() => {
            setIsSubmitted(true)
            onSubmit(card)
          }}
          disabled={isSubmitted || isFinished}
          variant="link"
        >
          Submit Card
        </Button>
      </div>
    </div>
  )
}
