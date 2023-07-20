import { useState } from "react";
import { ActionArgs } from "@remix-run/node";
import { Form, useRouteError, useSearchParams } from "@remix-run/react";
import { auth } from "~/config.server";

export async function action(args: ActionArgs) {
  return await auth.loginSubmitAction(args)
}

export default function LoginScreen() {
  const [newUser, setNewUser] = useState(false)
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') as string
  return <div className="grid h-screen place-items-center">
    <Form method="post" className="flex flex-col gap-2 pt-12">
      <h1>
        Enter your email, and we'll send you a code you can use to log in.
      </h1>
      <input type="hidden" name="redirect" value={redirect || ''} />
      <input placeholder="Your email here" type="email" name="email" className="rounded border border-stone-400 p-2" />
      {newUser &&
        <input placeholder="Your name" type="name" name="name" className="rounded border border-stone-400 p-2" />
      }

      <button
        className="w-full mt-3 px-5 py-1 rounded-md text-white bg-indigo-600 outline-none shadow-md focus:shadow-none focus:ring-2 ring-offset-2 ring-indigo-600 sm:mt-0 sm:w-auto disabled:bg-indigo-400 disabled:cursor-not-allowed"
        type="submit"
      >
        Send me the code!
      </button>
      <label>
        <input type="checkbox" name="register" className="rounded border border-stone-400 p-2" checked={newUser} onChange={e => setNewUser(e.target.checked)} />
        I'm a new user. Create an account for me.
      </label>
    </Form>
  </div>
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div>Something went wrong: {JSON.stringify(error)}</div>
}
