import Button from "~/components/Button"
import Navbar from "~/components/Navbar"

export default function ChatScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Navbar />
      <div className="grid flex-grow place-items-center">
        <h1>Chat</h1>
        <Button>
          <a href="/flow/rank">Continue</a>
        </Button>
      </div>
    </div>
  )
}
