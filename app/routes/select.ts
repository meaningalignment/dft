import { redirect } from "@remix-run/node"
import { defaultCase } from "~/lib/case"

export async function loader() {
  // Redirect to the select page for the default case.
  return redirect(`/case/${defaultCase}/select`)
}
