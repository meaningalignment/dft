import { LoaderFunctionArgs, redirect } from "@remix-run/node"
import { ensureLoggedIn, openai } from "~/config.server"

export async function loader({ request, params }: LoaderFunctionArgs) {
  await ensureLoggedIn(request)
  const caseId = params.caseId!
  const threadId = (await openai.beta.threads.create({})).id
  return redirect(`/case/${caseId}/chat/${threadId}`)
}
