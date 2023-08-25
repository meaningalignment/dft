import { LoaderArgs, json } from "@remix-run/node"
import Header from "~/components/header"
import { useLoaderData } from "@remix-run/react"
import { auth, db } from "~/config.server"
import { CanonicalValuesCard } from "@prisma/client"
import { useEffect, useRef } from "react"
import ValuesCard from "~/components/values-card"

type CardWithCounts = CanonicalValuesCard & {
  valuesCards: { userId: number }[]
  _count: {
    Vote: number
  }
}

export async function loader({ request }: LoaderArgs) {
  const userId = await auth.getUserId(request)

  const [
    userValuesCount,
    totalValuesCount,
    totalVotes,
    totalRelationships,
    carouselValues,
  ] = await Promise.all([
    db.canonicalValuesCard.count({
      where: {
        valuesCards: {
          some: {
            chat: {
              userId,
            },
          },
        },
      },
    }),
    db.canonicalValuesCard.count(),
    db.vote.count(),
    db.edge.count(),
    db.canonicalValuesCard.findMany({
      take: 12,
      include: {
        Vote: true,
        valuesCards: {
          select: {
            chat: {
              select: {
                userId: true,
              },
            },
          },
        },
        _count: {
          select: {
            Vote: true,
          },
        },
      },
    }),
  ])

  return json({
    userValuesCount,
    totalValuesCount,
    totalVotes,
    totalRelationships,
    carouselValues,
  })
}

function Carousel({ cards }: { cards: CardWithCounts[] }) {
  const carouselRef = useRef<HTMLDivElement | null>(null)

  const uniqueArticulations = (card: CardWithCounts) => {
    return [...new Set(card.valuesCards.map((c) => c.userId))].length
  }

  const uniqueVotes = (card: CardWithCounts) => {
    return card._count.Vote
  }

  const footerText = (card: CardWithCounts) => {
    return (
      `Articulated by ${uniqueArticulations(card)} participant${
        uniqueArticulations(card) > 1 ? "s" : ""
      }.` +
      `${
        uniqueVotes(card) > 0
          ? ` Endorsed by ${uniqueVotes(card)} participant${
              uniqueVotes(card) > 1 ? "s" : ""
            }.`
          : ``
      }`
    )
  }

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
        {cards.map((card, index) => (
          <div className="flex-grow">
            <ValuesCard key={index} card={card} />
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

export default function FinishedScreen() {
  const {
    userValuesCount,
    totalValuesCount,
    totalVotes,
    totalRelationships,
    carouselValues,
  } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center">
        <div className="flex flex-col items-center mx-4">
          <h1 className="text-4xl font-bold mb-8">Thank You!</h1>
          <p>
            You submitted{" "}
            <strong>
              {userValuesCount} value
              {userValuesCount > 1 ? "s" : ""}
            </strong>
            . In total, <strong>{totalValuesCount} values</strong> have been
            submitted.
          </p>
          <p>
            {totalRelationships} relationships have been created between values.
          </p>
        </div>

        <div className="overflow-x-hidden w-screen h-full flex justify-center">
          <Carousel cards={carouselValues as any} />
        </div>
      </div>
    </div>
  )
}
