import { ActionArgs, LoaderArgs, json } from "@remix-run/node"
import { ChatCompletionRequestMessage } from "openai-edge"
import { db } from "~/config.server"
import { systemPrompt } from "~/lib/consts"

export async function loader({ params }: LoaderArgs) {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({
    where: { id: chatId },
  })
  const messages = chat?.transcript ?? []

  return json({ messages })
}

export async function action({ request }: ActionArgs) {
  const body = await request.json()
  let { messages, chatId } = body

  // Prepend the system message and filter out empty messages
  // (can happen when a user regenerates a message).
  messages = [
    { role: "system", content: systemPrompt },
    ...messages.filter((message: any) => message.content !== ""),
  ] as ChatCompletionRequestMessage[]

  await db.chat.update({
    where: { id: chatId },
    data: { transcript: messages as any },
  })

  return json({ message: "Saved new messages in db" })
}
