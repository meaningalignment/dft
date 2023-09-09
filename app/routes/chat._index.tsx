import { v4 as uuid } from "uuid"
import { LoaderArgs, redirect } from "@remix-run/node"
import { articulatorConfig } from "~/cookies.server"

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url)
  const prompt = url.searchParams.get("prompt") || "default"
  return redirect(`/chat/${uuid()}`, {
    headers: {
      "Set-Cookie": await articulatorConfig.serialize(prompt),
    },
  })
}
