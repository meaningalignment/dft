import Button from "~/components/button"
import { Chat } from "~/components/chat"
import Header from "~/components/header"

export default function ChatScreen() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center">
        <Chat id={"foobar"} />
        <Button>
          <a href="/rank">Continue</a>
        </Button>
      </div>
    </div>
  )
}
