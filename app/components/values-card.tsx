import { isFirstWordUppercase } from "~/utils"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { ValuesCard as DataModel } from "@prisma/client"

type Props = {
  card: DataModel
}

function DetailsDialog({
  children,
  card,
}: {
  children: React.ReactNode
  card: DataModel
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-fit md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Details</DialogTitle>
          <DialogDescription>
            ChatGPT will be considered successful if, in dialogue with the user,
            the following kinds of things were surfaced or enabled:
          </DialogDescription>
        </DialogHeader>
        <div className="flex space-y-1 flex-col overflow-auto">
          {card.evaluationCriteria?.map((criterion, id) => (
            <li key={id} className="text-sm text-neutral-500">
              {isFirstWordUppercase(criterion) ? (
                <>
                  <strong className="font-bold text-neutral-600">
                    {criterion.split(" ")[0]}
                  </strong>{" "}
                  {criterion.split(" ").slice(1).join(" ")}
                </>
              ) : (
                <>{criterion}</>
              )}
            </li>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ValuesCard({ card }: Props) {
  return (
    <div
      className={
        "border-2 border-border rounded-xl px-8 pt-8 pb-4 max-w-sm h-full bg-white flex flex-col"
      }
    >
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructionsShort}</p>
      <p className="text-sm pt-4 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructionsDetailed}</p>
      <div className="flex-grow" />
      <div className="w-full flex flex-row mt-4 items-baseline">
        <DetailsDialog card={card}>
          <Button variant="link" className="pl-0">
            Show Details
          </Button>
        </DetailsDialog>
        <div className="flex-grow" />
      </div>
    </div>
  )
}
