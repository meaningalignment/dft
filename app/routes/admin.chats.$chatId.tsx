import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react"
import { Message } from "ai"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { ChatList } from "~/components/chat-list"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { auth, db } from "~/config.server"
import { evaluateTranscript } from "~/services/dialogue-evaluator"

export async function loader({ params, request }: LoaderArgs) {
  const chatId = params.chatId!
  const userId = await auth.getUserId(request)
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  const evaluation = chat?.evaluation as Record<string, string>
  const messages = (chat?.transcript as any as Message[]).slice(1).map((m) => {
    if (m.function_call) {
      m.content = JSON.stringify(m.function_call, null, 2)
    }

    return m
  })
  return json({ messages, evaluation, chatId, isUser: chat?.userId === userId })
}

export async function action({ params }: ActionArgs) {
  const chat = await db.chat.findFirst({
    where: {
      id: params.chatId,
    },
  })
  if (!chat) throw new Error("Chat not found")
  const result = await evaluateTranscript(chat)
  console.log("result", result)
  await db.chat.update({
    where: { id: params.chatId },
    data: { evaluation: result },
  })
  return json({ result })
}

function EvaluateButton() {
  const { chatId } = useLoaderData<typeof loader>()
  const { state } = useNavigation()
  return (
    <Form method="post">
      <input type="hidden" name="chatId" value={chatId} />
      {state === "submitting" ? (
        "Evaluating..."
      ) : (
        <Button type="submit">Evaluate</Button>
      )}
    </Form>
  )
}

function DuplicateButton({ chatId }: { chatId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const onClick = async () => {
    setIsLoading(true)
  }

  return (
    <Link to={`/admin/chats/${chatId}/duplicate`}>
      <Button variant={"secondary"} disabled={isLoading} onClick={onClick}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Duplicate
      </Button>
    </Link>
  )
}

function EnterButton({ chatId }: { chatId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const onClick = async () => {
    setIsLoading(true)
  }

  return (
    <Link to={`/chat/${chatId}`}>
      <Button variant={"secondary"} disabled={isLoading} onClick={onClick}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Enter
      </Button>
    </Link>
  )
}

export default function AdminChat() {
  const { messages, evaluation, chatId, isUser } =
    useLoaderData<typeof loader>()
  return (
    <>
      <div className="w-full max-w-2xl mx-auto my-4">
        {evaluation && (
          <>
            <h1 className="text-2xl font-bold mb-4">Evaluation</h1>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(evaluation, null, 2)}
            </pre>
          </>
        )}

        <div className="flex items-center justify-center gap-4 my-8">
          <EvaluateButton />

          {isUser && <EnterButton chatId={chatId} />}

          <DuplicateButton chatId={chatId} />
        </div>
      </div>
      <Separator className="my-4 md:my-8" />
      <ChatList
        messages={messages as Message[]}
        isFinished={true}
        isLoading={false}
        valueCards={[]}
        onManualSubmit={() => {}}
      />
    </>
  )
}
