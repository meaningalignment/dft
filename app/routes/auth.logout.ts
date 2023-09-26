import { ActionArgs } from "@remix-run/node";
import { auth } from "~/config.server";

export async function action(args: ActionArgs) {
  return await auth.logoutAction(args)
}
