import { ValuesCardCandidate } from "~/lib/consts"
import { Button } from "./button"
import { useState } from "react"

type Props = {
  card: ValuesCardCandidate
  onSubmit: (card: ValuesCardCandidate) => void
  isFinished: boolean
}

export default function ValuesCard({ card, onSubmit, isFinished }: Props) {
  const [isSubmitted, setIsSubmitted] = useState(false)

  return (
    <div className="my-8 border border-2 border-border rounded-xl px-8 pt-8 pb-4 max-w-[420px]">
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructions_short}</p>
      <p className="text-sm font-bold pt-2 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructions_detailed}</p>
      <div className="w-full flex flex-row mt-2">
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
