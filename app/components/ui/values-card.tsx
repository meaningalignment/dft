import { ValuesCardCandidate } from "~/lib/consts"

export default function ValuesCard({ card }: { card: ValuesCardCandidate }) {
  return (
    <div className="my-4 border border-2 border-border rounded-xl p-8 max-w-[420px]">
      <p className="text-md font-bold">{card.title}</p>
      <p className="text-md text-neutral-500">{card.instructions_short}</p>
      <p className="text-sm font-bold pt-2 font-bold text-stone-300">HOW?</p>
      <p className="text-sm text-neutral-500">{card.instructions_detailed}</p>
    </div>
  )
}
