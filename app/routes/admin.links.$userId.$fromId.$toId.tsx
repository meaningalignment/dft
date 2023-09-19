import { CanonicalValuesCard, Edge } from "@prisma/client"
import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react"
import { Message } from "ai"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { ChatList } from "~/components/chat-list"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { auth, db } from "~/config.server"
import { evaluateTranscript } from "~/services/dialogue-evaluator"

export async function loader({ params, request }: LoaderArgs) {
  const userId = parseInt(params.userId!)
  const fromId = parseInt(params.fromId!)
  const toId = parseInt(params.toId!)

  const edge = (await db.edge.findFirst({
    where: { userId, fromId, toId },
    include: { from: true, to: true },
  })) as Edge & { from: CanonicalValuesCard; to: CanonicalValuesCard }

  return json({ edge })
}

export default function AdminLink() {
  const { edge } = useLoaderData<typeof loader>()

  return (
    <div className="grid place-items-center space-y-4 py-12 px-8">
      <StaticChatMessage
        isFinished={true}
        text={'"' + edge. + '"'}
        role="user"
      />
      <div
        className={cn(
          `grid grid-cols-1 md:grid-cols-3 mx-auto gap-4 items-center justify-items-center md:grid-cols-[max-content,min-content,max-content] mb-4`,
          "transition-opacity ease-in duration-500",
          showCards ? "opacity-100" : "opacity-0",
          `delay-${75}`
        )}
      >
        <ValuesCard card={draw[index].from as any} />
        <IconArrowRight className="h-8 w-8 mx-auto rotate-90 md:rotate-0" />
        <ValuesCard card={draw[index].to as any} />
      </div>
      <div
        className={cn(
          `w-full flex items-center justify-center py-8`,
          "transition-opacity ease-in duration-500",
          showCards ? "opacity-100" : "opacity-0",
          `delay-${125}`
        )}
      >
        <Separator className="max-w-2xl" />
      </div>
      <div
        className={cn(
          "transition-opacity ease-in duration-500 flex flex-col items-center justify-center w-full max-w-xs",
          showCards ? "opacity-100" : "opacity-0",
          `delay-${150}`
        )}
      >
        <h1 className="font-bold mr-auto">
          Did this person make a value upgrade?
        </h1>
        <RadioGroup
          key={relationship}
          className="w-full"
          value={relationship ?? undefined}
          onValueChange={(r) => setRelationship(r as Relationship)}
        >
          <div className="flex flex-col space-y-2  w-full space-between mt-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={"upgrade"} id="yes" />
              <Label htmlFor="yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no_upgrade" id="no" />
              <Label htmlFor="no">No</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not_sure" id="not_sure" />
              <Label htmlFor="not_sure">Not Sure</Label>
            </div>
          </div>
        </RadioGroup>

        <div className="grid w-full max-w-sm items-center gap-2 mt-8">
          <Label htmlFor="comment">Why?</Label>
          <Textarea
            id="comment"
            disabled={!relationship}
            className="bg-white"
            onChange={(e) => setComment(e.target.value)}
            value={comment ?? ""}
            placeholder="Add your reasoning"
          />
        </div>

        <div className="mt-8">
          <Button disabled={!relationship || isLoading} onClick={onContinue}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {draw.length - index === 1 ? "Finish" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}
