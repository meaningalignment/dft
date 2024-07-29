import type { LoaderFunctionArgs, LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
import { kv } from "@vercel/kv"

function getDisplayName(name: string | null) {
  if (!name) return null
  return "Creating Values Card" // For now, only this function is supported.
}

export const loader: LoaderFunction = async ({
  params,
}: LoaderFunctionArgs): Promise<Response> => {
  const chatId = params.threadId!
  const name = await kv.get<string>(`function:${chatId}`)
  return json({ function: getDisplayName(name) })
}
