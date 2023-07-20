import { Button } from "~/components/ui/button"
import Header from "~/components/header"

export default function RankScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center">
        <h1>Rank Values</h1>
        <Button>
          <a href="/link">Continue</a>
        </Button>
      </div>
    </div>
  )
}
