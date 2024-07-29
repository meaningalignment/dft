import { LoaderFunctionArgs, json } from "@remix-run/node"
import Header from "~/components/header"
import { useLoaderData } from "@remix-run/react"
import { auth, db } from "~/config.server"
import Carousel from "~/components/carousel"
import { useCurrentUser } from "~/root"

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await auth.getUserId(request)

  const [
    userValuesCount,
    totalValuesCount,
    totalVotes,
    totalRelationships,
    carouselValues,
  ] = await Promise.all([
    db.valuesCard.count({
      where: {
        chat: {
          userId,
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
      orderBy: {
        Vote: {
          _count: "desc",
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

export default function FinishedScreen() {
  const user = useCurrentUser()

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
      <div className="grid flex-grow place-items-center py-12">
        <div className="flex flex-col items-center mx-auto max-w-xl text-center px-8">
          <h1 className="text-4xl font-bold mb-8">🙏 Thank You!</h1>

          <p>
            You've contributed{" "}
            <strong>
              {userValuesCount} value
              {userValuesCount > 1 ? "s" : ""}
            </strong>{" "}
            to our growing <strong>Moral Graph</strong>. So far, participants
            like you have articulated <strong>{totalValuesCount} values</strong>
            . A total of{" "}
            <strong>{totalRelationships} value-to-value relationships</strong>{" "}
            have been submitted, and <strong>{totalVotes} values</strong> have
            earned endorsements from other participants.
          </p>
          {user?.prolificId && (
            <div className="my-8 p-8 border-2 border-border rounded-xl">
              <h1 className="text-2xl my-8">
                Your prolific completion code is <strong>CG2S2REM</strong>
              </h1>
            </div>
          )}
        </div>

        <div className="overflow-x-hidden w-screen h-full flex justify-center mt-16">
          <Carousel cards={carouselValues as any[]} />
        </div>
      </div>
    </div>
  )
}
