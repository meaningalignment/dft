import { Button } from "./ui/button";

type Props = {
  polisId: string,
  finishedUrl: string,
}

export default function Polis(props: Props) {
  const { polisId, finishedUrl } = props

  return (
    <div className="relative min-h-screen pb-20">
      <div className="polis" data-conversation_id={polisId}></div>
      <div className="fixed inset-x-0 bottom-0 flex flex-col justify-center items-center bg-white py-12 border-t-[1px] shadow-2xl">
        <a href={finishedUrl}>
          <Button>Continue</Button>
        </a>
        <p className="text-gray-400 mt-4 mx-8 text-center">Only continue once you have voted for at least 3 statements, and shared your perspective.</p>
        <p className="text-gray-400 mx-8 text-center">Otherwise, your submission will be rejected.</p>
      </div>
      <script async src="https://pol.is/embed.js"></script>
    </div>
  )
}