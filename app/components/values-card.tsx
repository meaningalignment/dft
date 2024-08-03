import { isAllUppercase } from "~/utils"
import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

export type ValuesCardData = { title: string, instructionsShort: string, instructionsDetailed?: string | null, evaluationCriteria: string[], story?: string }

type Props = {
  card: ValuesCardData
  header?: React.ReactNode
  tiled?: boolean
  detailsInline?: boolean
  editButton?: React.ReactNode
  shouldTruncate?: boolean
}

function TruncatedDetailsList({ card, shouldTruncate = false }: { card: ValuesCardData, shouldTruncate: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && shouldTruncate) {
      setNeedsTruncation(card.evaluationCriteria.length > 5)
    }
  }, [card.evaluationCriteria, shouldTruncate])

  const toggleExpand = () => setIsExpanded(!isExpanded)

  return (
    <div className="flex flex-col overflow-hidden">
      <div
        ref={contentRef}
        className={`flex flex-col gap-y-1 ${!isExpanded && needsTruncation ? "max-h-32 overflow-hidden relative" : ""}`}
      >
        {card.evaluationCriteria.map((criterion, id) => (
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
        {!isExpanded && needsTruncation && (
          <div className="absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-blue-100 to-transparent" />
        )}
      </div>
      {needsTruncation && (
        <button
          onClick={toggleExpand}
          className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center w-full transition-colors duration-200"
        >
          {isExpanded ? (
            <>
              See less <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              See more <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default function ValuesCard({ card, header, editButton, shouldTruncate = false }: Props) {
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
          WHERE MY ATTENTION GOES
        </p>
        <TruncatedDetailsList card={card} shouldTruncate={shouldTruncate} />
      </div>
    </div>
  )
}