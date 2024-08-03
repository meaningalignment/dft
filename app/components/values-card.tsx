import { isAllUppercase } from "~/utils"
import React from "react"

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
      <li key={id} className="text-sm text-neutral-500 list-none">
        {criterion.split(" ").map((word, index) => (
          <React.Fragment key={`${id}/${index}`}>
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
}

export default function ValuesCard({ card, header, editButton }: Props) {
  return (
    <div
      className={
        `border-2 border-border rounded-xl px-8 pt-8 pb-6 max-w-sm h-full bg-white flex flex-col`
      }
    >
      {header && header}
      {editButton ? <div className="flex flex-row justify-between items-center">
        <p className="text-md font-bold">{card.title}</p>
        {editButton}
      </div> : <p className="text-md font-bold">{card.title}</p>}
      <p className="text-md text-neutral-500">{card.story ?? card.instructionsShort}</p>
      <div className="px-4 py-2 -mx-4 mt-4 place-self-stretch bg-blue-100 rounded-md">
        <p className="text-xs font-bold text-neutral-500 mb-3">
          {/* <Eye className="h-4 w-4 inline-block mr-2" /> */}
          WHERE MY ATTENTION GOES
        </p>
        <DetailsList card={card} />
      </div>
    </div>
  )
}
