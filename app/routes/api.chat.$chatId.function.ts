import {
  ActionArgs,
  ActionFunction,
  LoaderArgs,
  LoaderFunction,
  json,
} from "@remix-run/node"
import { Message } from "ai"
import { db } from "~/config.server"

function getDisplayName(functionName?: string) {
  switch (functionName) {
    case "show_values_card":
      return "Articulating Values Card"
    case "submit_card":
      return "Submitting Card"
  }

  return null
}

export const loader: LoaderFunction = async ({
  params,
}: LoaderArgs): Promise<Response> => {
  const chatId = params.chatId
  const chat = await db.chat.findUnique({ where: { id: chatId } })

  if (!chat) {
    return json({ error: "Chat not found" }, { status: 404 })
  }

  const messages = chat?.transcript as any as Message[]
  const lastMessage = messages[messages.length - 1]
  const functionName = (lastMessage.function_call as any)?.name

  return json({ function: getDisplayName(functionName) })
}
