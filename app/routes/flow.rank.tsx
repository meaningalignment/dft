import Button from "~/components/Button"
import Navbar from "~/components/Navbar"

export default function RankScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Navbar />
      <div className="grid flex-grow place-items-center">
        <h1>Rank Values</h1>
        <Button>
          <a href="/flow/link">Continue</a>
        </Button>
      </div>
    </div>
  )
}
