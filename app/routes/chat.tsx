import { Message } from "ai"
import { Chat } from "../components/chat"
import Header from "../components/header"
import { v4 as uuid } from "uuid"
import { useRef } from "react"
import { seedQuestion } from "~/lib/consts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import ValuesDialog from "~/components/values-dialog"

const initialMessages: Message[] = [
  { id: "seed", content: seedQuestion, role: "assistant" },
]

export default function ChatScreen() {
  const chatId = useRef(uuid()).current

  return (
    <Dialog>
      <div className="flex flex-col h-screen w-screen">
        <Header chatId={chatId} />
        <Chat id={chatId} initialMessages={initialMessages} />
      </div>
      <ValuesDialog />
    </Dialog>
  )
}
