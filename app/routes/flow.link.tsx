import Button from "~/components/Button"
import Navbar from "~/components/Navbar"

export default function LinkScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Navbar />
      <div className="grid flex-grow place-items-center">
        <h1>Link Values</h1>
        <Button>
          <a href="/flow/finished">Finish</a>
        </Button>
      </div>
    </div>
  )
}
