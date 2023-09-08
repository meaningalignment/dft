import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { Form, useLoaderData, useNavigation } from "@remix-run/react"
import { Message } from "ai"
import { ChatList } from "~/components/chat-list"
import { Button } from "~/components/ui/button"
import { db } from "~/config.server"
import { evaluateTranscript } from "~/services/dialogue-evaluator"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  if (!chat) throw new Error("Chat not found")
  const evaluation = chat?.evaluation as Record<string, string>
  const messages = (chat?.transcript as any as Message[]).slice(1)
  return json({ messages, evaluation, chatId, chat })
}

export async function action({ params }: ActionArgs) {
  const chat = await db.chat.findFirst({
    where: {
      id: params.chatId,
    },
  })
  if (!chat) throw new Error("Chat not found")
  const result = await evaluateTranscript(chat)
  console.log('result', result)
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
      {state === 'submitting' ? 'Evaluating...' : <Button type="submit" size="sm" variant="secondary">Evaluate</Button>}
    </Form>
  )
}

function InfoBlock({ title, details }: { title: string, details: Record<string, string> }) {
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
  const { messages, evaluation, chat } = useLoaderData<typeof loader>()
  let { articulatorPromptHash, articulatorPromptVersion, gitCommitHash } = chat
  articulatorPromptHash = articulatorPromptHash.slice(0, 8)
  if (evaluation) delete evaluation['metadata']
  return (
    <>
      <div className="border bg-slate-200 rounded-md shadow-sm px-4 py-2 mb-6 max-w-sm mx-auto">
        <InfoBlock title="Metadata" details={{
          articulatorPromptHash,
          articulatorPromptVersion,
          gitCommitHash,
        }} />
        {evaluation ? (
          <InfoBlock title="Evaluation" details={evaluation} />
        ) : null}
        <EvaluateButton />
      </div>
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

