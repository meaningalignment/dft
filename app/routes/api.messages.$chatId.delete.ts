import { ActionFunctionArgs, json } from "@remix-run/node"
import { Message } from "ai"
import { db } from "~/config.server"

// Export for tests.
export function removeLastMatchAndPrecedingFunctions(
  messages: Message[],
  predicate: (message: Message) => boolean
): Message[] {
  let shouldRemove = false
  let userOrAssistantFound = false

  for (let i = messages.length - 1; i >= 0; i--) {
    const isFunction =
      messages[i].role === "function" || messages[i].function_call

    if (!isFunction && predicate(messages[i])) {
      shouldRemove = true
      userOrAssistantFound = true
    }

    if (shouldRemove && !isFunction && !userOrAssistantFound) {
      break
    }

    if (shouldRemove) {
      messages.splice(i, 1)
    }

    if (shouldRemove && !isFunction) {
      userOrAssistantFound = false
    }
  }

  return messages
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json()
  let { message, chatId } = body

  const chat = await db.chat.findUnique({ where: { id: chatId } })

  if (!chat) {
    throw new Error(`No chat with id ${chatId}`)
  }

  const messages = chat.transcript as any as Message[]

  // Remove the last occurence of a message with the matching content and role,
  // and all directly preceeding function calls.
  //
  // Note that we don't store message IDs in the database,
  // so we cannot be certain this is the correct message.
  // If there are several messages with the same role and content,
  // the last one will be removed regardless of which one was actually clicked.
  //
  // Since this feature is only available for admin users, this is acceptable for now.
  const newMessages = removeLastMatchAndPrecedingFunctions(
    messages,
    (m) => m.content === message.content && m.role === message.role
  )

  console.log(`Removed messages from chat ${chatId}.`)

  await db.chat.update({
    where: { id: chatId },
    data: { transcript: newMessages as any },
  })

  return json({ message: "Removed message in db" })
}
