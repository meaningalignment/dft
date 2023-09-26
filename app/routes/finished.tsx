import { LoaderArgs, json } from "@remix-run/node"
import Header from "~/components/header"
import { useLoaderData } from "@remix-run/react"
import { auth, db } from "~/config.server"
import Carousel from "~/components/carousel"
import { useCurrentUser } from "~/root"

export async function loader({ request }: LoaderArgs) {
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
                <a
                  href={`https://docs.google.com/forms/d/e/1FAIpQLScVFNHjitH7rjCn43EFH4zH_H0K0WAlfwEi2oM2vetOFPm-0w/viewform?usp=pp_url&entry.1333431336=${user?.prolificId}`}
                  className="underline hover:opacity-80 active:opacity-60"
                >
                  Click here for completion survey & Prolific completion code
                </a>
              </h1>
            </div>
          )}
          <p className="text-sm text-neutral-500 my-8">
            Once the Moral Graph is complete, you'll receive a follow-up email
            showcasing the results.
          </p>
        </div>

        <div className="overflow-x-hidden w-screen h-full flex justify-center">
          <Carousel cards={carouselValues as any[]} />
        </div>
      </div>
    </div>
  )
}
