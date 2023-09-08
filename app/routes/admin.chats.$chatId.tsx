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
    <Form method="post">
      <input type="hidden" name="chatId" value={chatId} />
      {state === 'submitting' ? 'Evaluating...' : <Button type="submit">Evaluate</Button>}
    </Form>
  )
}

export default function AdminChat() {
  const { messages, evaluation, chat } = useLoaderData<typeof loader>()
  const { articulatorPromptHash, articulatorPromptVersion, gitCommitHash } = chat
  return (
    <>
      <h1 className="text-2xl font-bold mb-4" >Metadata</h1>
      <pre className="whitespace-pre-wrap">{JSON.stringify({
        articulatorPromptHash,
        articulatorPromptVersion,
        gitCommitHash,
      }, null, 2)}</pre>
      {
        evaluation ? (
          <div className="border-l my-4">
            <h1 className="text-2xl font-bold mb-4" >Evaluation</h1>
            <pre className="whitespace-pre-wrap">{JSON.stringify(evaluation, null, 2)}</pre>
            <EvaluateButton />
          </div>
        ) : <EvaluateButton />
      }
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

