import { v4 as uuid } from "uuid"
import { LoaderFunctionArgs, redirect } from "@remix-run/node"
import { articulatorConfig } from "~/cookies.server"

export async function loader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId!
  return redirect(`/case/${caseId}/chat/${uuid()}`, {
    headers: {
      "Set-Cookie": await articulatorConfig.serialize("default"),
    },
  })
}
