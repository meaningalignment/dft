import { CanonicalValuesCard } from "@prisma/client"
import { useEffect, useRef } from "react"
import ValuesCard from "./values-card"

type CardWithCounts = CanonicalValuesCard & {
  valuesCards: { userId: number }[]
  _count: {
    Vote: number
  }
}

export default function Carousel({ cards }: { cards: CardWithCounts[] }) {
  const carouselRef = useRef<HTMLDivElement | null>(null)

  const uniqueVotes = (card: CardWithCounts) => {
    return card._count.Vote
  }

  const footerText = (card: CardWithCounts) =>
    `${
      uniqueVotes(card) > 0
        ? ` Endorsed by ${uniqueVotes(card)} participant${
            uniqueVotes(card) > 1 ? "s" : ""
          }.`
        : ``
    }`

  useEffect(() => {
    let position = 0
    const scrollAmount = 10
    const transitionSpeed = 1000

    const interval = setInterval(() => {
      if (carouselRef.current) {
        position += scrollAmount
        carouselRef.current.style.transform = `translateX(-${position}px)`
        carouselRef.current.style.transition = `transform ${transitionSpeed}ms linear`
      }
    }, transitionSpeed)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative z-0 w-full">
      <div ref={carouselRef} className="flex hide-scrollbar space-x-4">
        {cards.map((card) => (
          <div key={card.id} className="flex flex-col">
            <div className="flex-grow w-96">
              <ValuesCard card={card} shouldTruncate={true} />
            </div>
            <p className="mx-8 mt-2 text-sm text-neutral-500">
              {footerText(card)}
            </p>
          </div>
        ))}
      </div>

      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-20"></div>
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-20"></div>
    </div>
  )
}
