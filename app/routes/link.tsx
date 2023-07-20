import Button from "~/components/button"
import Header from "~/components/header"

export default function LinkScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center">
        <h1>Link Values</h1>
        <Button>
          <a href="/finished">Finish</a>
        </Button>
      </div>
    </div>
  )
}
