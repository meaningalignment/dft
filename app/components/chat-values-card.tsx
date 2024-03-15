import { ValuesCardData } from "~/lib/consts"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { isAllUppercase } from "~/utils"
import React from "react"
import { useValueStyle } from "~/root"

type Props = {
  card: ValuesCardData
  isFinished: boolean
}

export default function ChatValuesCard({ card }: Props) {
  const style = useValueStyle()

  return (
    <div className="my-8 border-2 border-border rounded-xl px-8 pt-8 pb-4 max-w-[420px]">
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructions_short}</p>
      <p className="text-sm pt-4 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructions_detailed}</p>
      <div className="w-full flex flex-row mt-4 items-baseline">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" className="pl-0">
              Show Details
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-fit md:max-w-xl">
            <DialogHeader>
              <DialogTitle>Details</DialogTitle>
              <DialogDescription>
                {style.evaluationCriteriaIntroString}
              </DialogDescription>
            </DialogHeader>
            <div className="flex space-y-1 flex-col overflow-auto">
              {card.evaluation_criteria?.map((criterion, id) => (
                <li key={id} className="text-sm text-neutral-500">
                  {criterion.split(" ").map((word, index) => (
                    <React.Fragment key={word}>
                      {isAllUppercase(word) ? (
                        <strong className="font-bold text-neutral-600">
                          {word}
                        </strong>
                      ) : (
                        word
                      )}
                      {index < criterion.split(" ").length - 1 ? " " : null}
                    </React.Fragment>
                  ))}
                </li>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex-grow" />
      </div>
    </div>
  )
}
