import { v4 as uuid } from "uuid"
import { LoaderArgs, redirect } from "@remix-run/node"

export async function loader({ params }: LoaderArgs) {
  const caseId = params.caseId!
  return redirect(`/case/${caseId}/chat/${uuid()}`)
}
