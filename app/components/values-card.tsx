import { cn, isAllUppercase } from "~/utils"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { ValuesCard as DataModel, CanonicalValuesCard } from "@prisma/client"
import React from "react"
import { valueStyle } from "~/lib/consts"

type Props = {
  card: DataModel | CanonicalValuesCard
  header?: React.ReactNode
  inlineDetails?: boolean
}

function Details({ card }: { card: DataModel | CanonicalValuesCard }) {
  return (
    <div className="flex flex-col overflow-auto">
      {card.evaluationCriteria?.map((criterion, id) => (
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
  )
}

function DetailsDialog({
  children,
  card,
}: {
  children: React.ReactNode
  card: DataModel | CanonicalValuesCard
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-fit md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Details</DialogTitle>
          <DialogDescription>
            {valueStyle.evaluationCriteriaIntroString}
          </DialogDescription>
        </DialogHeader>
        <Details card={card} />
      </DialogContent>
    </Dialog>
  )
}

export default function ValuesCard({ card, header, inlineDetails }: Props) {
  return (
    <div
      className={
        "border-2 border-border rounded-xl px-8 pt-8 pb-4 max-w-sm h-full bg-white flex flex-col"
      }
    >
      {header && header}
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructionsShort}</p>
      {!inlineDetails && (
        <>
          <p className="text-sm pt-4 font-bold text-stone-300">HOW?</p>
          <p className="text-sm text-neutral-500">{card.instructionsDetailed}</p>
        </>
      )}
      <div className="flex-grow" />
      <div className="w-full flex flex-row items-baseline mt-4">
        {inlineDetails ? (<>
          <Details card={card} />
        </>) :
          (<DetailsDialog card={card}>
            <Button
              variant="link"
              className="pl-0"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              Show Details
            </Button>
          </DetailsDialog>)
        }
        <div className="flex-grow" />
      </div>
    </div>
  )
}
