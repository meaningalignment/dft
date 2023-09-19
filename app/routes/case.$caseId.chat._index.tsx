import { v4 as uuid } from "uuid"
import { LoaderArgs, redirect } from "@remix-run/node"
import { articulatorConfig } from "~/cookies.server"

export async function loader({ request, params }: LoaderArgs) {
  const caseId = params.caseId!
  const url = new URL(request.url)
  let prompt = url.searchParams.get("prompt")
  // randomize it!
  if (!prompt) {
    prompt = Math.random() > 0.5 ? "default" : "guess_card"
  }
  return redirect(`/case/${caseId}/chat/${uuid()}`, {
    headers: {
      "Set-Cookie": await articulatorConfig.serialize(prompt),
    },
  })
}
