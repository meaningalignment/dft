import { LoaderArgs, json, redirect } from "@remix-run/node"
import { Button } from "~/components/ui/button"
import { Link, useLoaderData } from "@remix-run/react"
import Header from "~/components/header"
import Carousel from "~/components/carousel"
import { db } from "~/config.server"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export async function loader({ request }: LoaderArgs) {
  const carouselValues = await db.canonicalValuesCard.findMany({
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
  })

  return json({ carouselValues })
}

export default function StartPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { carouselValues } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center py-12">
        <div className="flex flex-col items-center mx-auto max-w-2xl text-center px-8">
          <h1 className="text-3xl font-bold mb-8">
            Welcome to Democratic Fine-Tuning!
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            You will be asked how ChatGPT should act in a morally tricky
            situation by articuating a value and considering those of others.
            Your input will contribute to a moral graph used to fine-tune future
            models. This process will take around 15 minutes.
          </p>
          <Button disabled={isLoading} onClick={() => setIsLoading(true)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Link to="/chat">Let's Go</Link>
          </Button>
        </div>

        <div className="overflow-x-hidden w-screen h-full flex justify-center pt-12">
          <Carousel cards={carouselValues as any[]} />
        </div>
      </div>
    </div>
  )
}
