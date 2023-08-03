import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { DialogFooter, DialogHeader } from "./ui/dialog"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useCurrentUserValues } from "~/root"
import { ValuesCard } from "@prisma/client"

function Card({ card }: { card: ValuesCard }) {
  return (
    <div className="border border-2 border-border rounded-xl p-8 w-[420px]">
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructionsShort}</p>
      <p className="text-sm font-bold pt-2 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructionsDetailed}</p>
    </div>
  )
}

export default function ValuesDialog({
  children,
}: {
  children?: React.ReactNode
}) {
  const values = useCurrentUserValues()

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-fit md:max-w-3xl lg:max-w-fit">
        <DialogHeader>
          <DialogTitle>Your Values</DialogTitle>
          <DialogDescription>
            The values you have articulated so far.
          </DialogDescription>
        </DialogHeader>
        <div className="flex space-y-4 flex-row items-center overflow-auto">
          {values?.map((value) => (
            <Card key={value.id} card={value} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
