import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { Link } from "@remix-run/react"

export default function LinkScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center">
        <h1>Link Values</h1>
        <Button asChild>
          <Link to="/finished">Finish</Link>
        </Button>
      </div>
    </div>
  )
}
