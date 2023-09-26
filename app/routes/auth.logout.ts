import { ActionFunctionArgs } from "@remix-run/node"
import { auth } from "~/config.server"

export async function action(args: ActionFunctionArgs) {
  return await auth.logoutAction(args)
}
