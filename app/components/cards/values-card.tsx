import { isAllUppercase } from "~/utils"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import React from "react"
import { valueStyle } from "~/lib/consts"
import { Eye } from "lucide-react"

export type ValuesCardData = { title: string, instructionsShort: string, instructionsDetailed?: string | null, evaluationCriteria: string[], story?: string }

type Props = {
  card: ValuesCardData
  header?: React.ReactNode
  tiled?: boolean
  detailsInline?: boolean
  editButton?: React.ReactNode
}

function DetailsList({ card }: { card: ValuesCardData }) {
  return <div className="flex flex-col overflow-auto gap-y-1">
    {card.evaluationCriteria?.map((criterion, id) => (
      <li key={id} className="text-sm text-neutral-500 dark:text-neutral-300 list-none">
        {criterion.split(" ").map((word, index) => (
          <React.Fragment key={`${id}/${index}`}>
            {isAllUppercase(word) ? (
              <strong className="font-bold text-neutral-600 dark:text-neutral-200">
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
}

function DetailsDialog({
  children,
  card,
}: {
  children: React.ReactNode
  card: ValuesCardData
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
        <DetailsList card={card} />
      </DialogContent>
    </Dialog>
  )
}

export default function ValuesCard({ card, header, detailsInline, editButton }: Props) {
  return (
    <div
      className={
        `border-2 border-border rounded-xl px-8 pt-8 pb-6 max-w-sm h-full bg-white dark:bg-black dark:text-white flex flex-col`
      }
    >
      {header && header}
      {editButton ? <div className="flex flex-row justify-between items-center">
        <p className="text-md font-bold">{card.title}</p>
        {editButton}
      </div> : <p className="text-md font-bold">{card.title}</p>}
      <p className="text-md text-neutral-500 dark:text-neutral-300">{card.story ?? card.instructionsShort}</p>
      {!detailsInline && card.instructionsDetailed && (
        <>
          <p className="text-sm pt-4 font-bold text-stone-300">HOW</p>
          <p className="text-sm text-neutral-500 max-h-44 overflow-y-auto dark:text-neutral-300">{card.instructionsDetailed}</p>
          <div className="flex-grow" />
        </>
      )}
      {detailsInline ? (
        <div className="px-4 py-2 -mx-4 mt-4 place-self-stretch bg-blue-100 rounded-md">
          <p className="text-xs font-bold text-neutral-500 mb-3">
            {/* <Eye className="h-4 w-4 inline-block mr-2" /> */}
            WHERE MY ATTENTION GOES
          </p>
          <DetailsList card={card} />
        </div>
      )
        : (
          <div className="w-full flex flex-row mt-4 justify-between items-center">
            <DetailsDialog card={card}>
              <Button
                variant="link"
                className="pl-0"
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                Show Details
              </Button>
            </DetailsDialog>
          </div>
        )
      }
    </div>
  )
}
