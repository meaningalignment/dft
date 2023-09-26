import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react"
import { Message } from "ai"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { ChatList } from "~/components/chat-list"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { auth, db } from "~/config.server"
import { evaluateTranscript } from "~/values-tools/dialogue-evaluator"

export async function loader({ params, request }: LoaderFunctionArgs) {
  const chatId = params.chatId!
  const userId = await auth.getUserId(request)
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  if (!chat) throw new Error("Chat not found")
  const evaluation = chat?.evaluation as Record<string, string>
  const messages = (chat?.transcript as any as Message[]).slice(1).map((m) => {
    if (m.function_call) {
      m.content = JSON.stringify(m.function_call, null, 2)
    }

    return m
  })
  return json({
    messages,
    evaluation,
    chatId,
    chat,
    isUser: chat?.userId === userId,
  })
}

export async function action({ params }: ActionFunctionArgs) {
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
    <Form method="post" className="mt-4 text-right">
      <input type="hidden" name="chatId" value={chatId} />
      {state === "submitting" ? (
        "Evaluating..."
      ) : (
        <Button type="submit" size="sm" variant="secondary">
          Evaluate
        </Button>
      )}
    </Form>
  )
}

function DebugButton({
  chatId,
  shouldDuplicate,
}: {
  chatId: string
  shouldDuplicate: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)

  const onClick = async () => {
    setIsLoading(true)
  }

  return (
    <Link
      to={
        shouldDuplicate ? `/admin/chats/${chatId}/duplicate` : `/chat/${chatId}`
      }
    >
      <Button disabled={isLoading} onClick={onClick}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {shouldDuplicate ? "Duplicate & Debug" : "Debug"}
      </Button>
    </Link>
  )
}

function InfoBlock({
  title,
  details,
}: {
  title: string
  details: Record<string, string>
}) {
  const keys = Object.keys(details).sort((a, b) => a.localeCompare(b))
  return (
    <div>
      <h1 className="text-lg mt-2">{title}</h1>
      {keys.map((key) => (
        <div key={key} className="grid grid-cols-2 w-full">
          <div className="text-xs">{key}</div>
          <div className="text-xs text-red-900">{details[key]}</div>
        </div>
      ))}
    </div>
  )
}

export default function AdminChat() {
  const { messages, evaluation, chat, chatId, isUser } =
    useLoaderData<typeof loader>()
  let { articulatorPromptHash, articulatorPromptVersion, gitCommitHash } = chat
  articulatorPromptHash = articulatorPromptHash.slice(0, 8)
  if (evaluation) delete evaluation["metadata"]
  return (
    <>
      <div className="border bg-slate-200 rounded-md shadow-sm px-4 py-2 mb-6 max-w-sm mx-auto">
        <InfoBlock
          title="Metadata"
          details={{
            articulatorPromptHash,
            articulatorPromptVersion,
            gitCommitHash,
          }}
        />
        {evaluation ? (
          <InfoBlock title="Evaluation" details={evaluation} />
        ) : null}
        <EvaluateButton />
      </div>
      <div className="w-full max-w-2xl mx-auto my-4">
        <div className="flex items-center justify-center gap-4 my-8">
          <DebugButton
            chatId={chatId}
            shouldDuplicate={!(isUser && chat.copiedFromId)}
          />
        </div>
      </div>
      <Separator className="my-4 md:my-8" />
      <ChatList
        messages={messages as Message[]}
        isFinished={true}
        isLoading={false}
        valueCards={[]}
        onManualSubmit={() => { }}
      />
    </>
  )
}
