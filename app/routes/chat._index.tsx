import { redirect } from "@remix-run/node"
import { db } from "~/config.server"

export async function loader() {
  const defaultCase = (await db.case.findFirst({ orderBy: { id: "asc" } }))!.id
  return redirect(`/case/${defaultCase}/chat`)
}
