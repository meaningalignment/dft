import { CanonicalValuesCard, Edge } from "@prisma/client"
import { LoaderFunctionArgs, json } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import StaticChatMessage from "~/components/static-chat-message"
import { IconArrowRight } from "~/components/ui/icons"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Separator } from "~/components/ui/separator"
import { Textarea } from "~/components/ui/textarea"
import ValuesCard from "~/components/values-card"
import { db } from "~/config.server"
import { cn } from "~/utils"

export async function loader({ params }: LoaderFunctionArgs) {
  const userId = parseInt(params.userId!)
  const fromId = parseInt(params.fromId!)
  const toId = parseInt(params.toId!)

  const edge = (await db.edge.findFirst({
    where: { userId, fromId, toId },
    include: { from: true, to: true },
  })) as Edge & { from: CanonicalValuesCard; to: CanonicalValuesCard }

  const [yesCount, noCount, notSureCount] = await Promise.all([
    db.edge.count({ where: { fromId, toId, relationship: "upgrade" } }),
    db.edge.count({ where: { fromId, toId, relationship: "no_upgrade" } }),
    db.edge.count({ where: { fromId, toId, relationship: "not_sure" } }),
  ])

  return json({ edge, stats: { yesCount, noCount, notSureCount } })
}

export default function AdminLink() {
  const { edge, stats } = useLoaderData<typeof loader>()

  return (
    <div className="grid place-items-center space-y-4 py-12 px-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-md font-bold mb-2 pl-12 md:pl-0">
          {edge.condition}
        </h1>
        <StaticChatMessage
          text={'"' + edge.story + '"'}
          onFinished={() => {}}
          isFinished={true}
          role="user"
        />
      </div>
      <div
        className={cn(
          `grid grid-cols-1 md:grid-cols-3 mx-auto gap-4 items-center justify-items-center md:grid-cols-[max-content,min-content,max-content] mb-4`
        )}
      >
        <ValuesCard card={edge.from as any} />
        <IconArrowRight className="h-8 w-8 mx-auto rotate-90 md:rotate-0" />
        <ValuesCard card={edge.to as any} />
      </div>
      <div className={cn(`w-full flex items-center justify-center py-8`)}>
        <Separator className="max-w-2xl" />
      </div>
      <div className="transition-opacity ease-in duration-500 flex flex-col items-center justify-center w-full max-w-xs">
        <h1 className="font-bold mr-auto">
          Did this person make a value upgrade?
        </h1>
        <RadioGroup
          disabled={true}
          key={edge.relationship}
          className="w-full"
          value={edge.relationship}
        >
          <div className="flex flex-col space-y-2  w-full space-between mt-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={"upgrade"} id="yes" />
              <Label htmlFor="yes">Yes ({stats.yesCount} votes in total)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no_upgrade" id="no" />
              <Label htmlFor="no">No ({stats.noCount} votes in total)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not_sure" id="not_sure" />
              <Label htmlFor="not_sure">
                Not Sure ({stats.notSureCount} votes in total)
              </Label>
            </div>
          </div>
        </RadioGroup>

        <div className="grid w-full max-w-sm items-center gap-2 mt-8">
          <Label htmlFor="comment">Why?</Label>
          <Textarea
            id="comment"
            disabled={true}
            className="bg-white min-h-[200px]"
            value={edge.comment ?? ""}
          />
        </div>
      </div>
    </div>
  )
}
