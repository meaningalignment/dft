import { v4 as uuid } from "uuid"
import { redirect } from "@remix-run/node"

export async function loader() {
  return redirect(`/chat/${uuid()}`)
}
