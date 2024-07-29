import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { kv } from "@vercel/kv";
import { Chat } from "../components/chat";
import Header from "../components/header";
import { db, ensureLoggedIn, openai } from "~/config.server";


export async function loader({ request, params }: LoaderFunctionArgs) {
  await ensureLoggedIn(request)
  const threadId = params.threadId!
  const caseId = params.caseId!

  // Get messages.
  const response = await openai.beta.threads.messages.list(threadId, { order: 'asc' })
  const messages = response.data.map((m: any) => {
    const m2: any = m
    if (m.content && m.content[0]?.text?.value) {
      m2.content = m.content[0].text.value
    }
    return m2
  })

  // Get data message if it exists.
  const data = await kv.get<string>(`data:${threadId}`)
  if (data) {
    // Insert the data message in second to last position.
    messages.push({ role: 'data', data })
    const lastElement = messages.pop()
    const secondLastElement = messages.pop()
    messages.push(lastElement)
    messages.push(secondLastElement)
  }

  // cancel runs.
  const runs = await openai.beta.threads.runs.list(threadId)
  await Promise.all(runs.data.map((run) => {
    if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'requires_action') {
      return openai.beta.threads.runs.cancel(threadId, run.id)
    }
  }))

  // Get the welcome message.
  const chosenCase = await db.case.findFirst({ where: { id: caseId } })
  const seedMessage = chosenCase!.seedMessage

  return json({ messages, seedMessage })
}

export default function ChatScreen() {
  const { threadId } = useParams()
  const { messages, seedMessage } = useLoaderData<typeof loader>()

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <Chat
        threadId={threadId!}
        oldMessages={messages}
        seedMessage={seedMessage}
      />
    </div>
  )
}