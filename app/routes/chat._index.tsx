import { v4 as uuid } from "uuid"
import { redirect } from "@remix-run/node"
import { articulatorConfig } from "~/cookies.server"

export async function loader() {
  return redirect(`/chat/${uuid()}`, {
    headers: {
      "Set-Cookie": await articulatorConfig.serialize('default'),
    },
  })
}
