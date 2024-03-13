import { LoaderFunctionArgs, redirect } from "@remix-run/node"
import { db } from "~/config.server"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  
  const prolificId = url.searchParams.get("prolificId")
  if (!prolificId) return new Response("No prolificId", { status: 404 })

  const user = await db.user.findFirst({ where: { prolificId } })
  if (!user) return new Response("No user", { status: 404 })

  return redirect(`/survey/deduplications/${user.id}/`)
}
