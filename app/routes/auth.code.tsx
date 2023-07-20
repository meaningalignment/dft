import { Form, isRouteErrorResponse, useActionData, useLoaderData, useRouteError, useSearchParams } from "@remix-run/react";
import { LoaderArgs, ActionArgs } from "@remix-run/node/dist";
import { ReactNode, useEffect, useState } from "react";
import { auth } from "~/config.server";

export async function loader(args: LoaderArgs) {
  return await auth.codeLoader(args)
}

export async function action(args: ActionArgs) {
  return await auth.codeSubmitAction(args)
}

function CodeScreen({ children, resent }: { children?: ReactNode, resent?: string }) {
  const [canResend, setCanResend] = useState<boolean>(false)
  const [searchParams] = useSearchParams()
  const { LOGIN_EMAIL_FROM } = useLoaderData<typeof loader>()
  useEffect(() => {
    const timeout = setTimeout(() => setCanResend(true), 10_000)
    return () => { clearTimeout(timeout) }
  }, [])

  const email = searchParams.get('email') as string | undefined
  const successRedirect = searchParams.get('successRedirect') as string

  return <div className="grid h-screen place-items-center">
    <Form method="post" className="flex flex-col gap-2 pt-12">
      <h1>
        {children || <>
          Please check your email for a six digit code!<br /> (Look for an email from {LOGIN_EMAIL_FROM})
        </>}
      </h1>
      <input type="hidden" name="type" value="code" />
      <input type="hidden" name="email" value={email} />
      {successRedirect ? <input type="hidden" name="successRedirect" value={successRedirect} /> : null}
      <input placeholder="Six digit code" type="input" name="code" className="rounded border border-stone-400 p-2" />
      <button
        className="w-full mt-3 px-5 py-1 rounded-md text-white bg-indigo-600 outline-none shadow-md focus:shadow-none focus:ring-2 ring-offset-2 ring-indigo-600 sm:mt-0 sm:w-auto disabled:bg-indigo-400 disabled:cursor-not-allowed"
        type="submit"
      >
        Let me in!
      </button>
    </Form>
    <Form method="post">
      <input type="hidden" name="resend" value="yes" />
      <input type="hidden" name="email" value={email} />
      <button
        disabled={!canResend}
        className="w-full mt-3 px-5 py-1 rounded-md text-white bg-indigo-600 outline-none shadow-md focus:shadow-none focus:ring-2 ring-offset-2 ring-indigo-600 sm:mt-0 sm:w-auto disabled:bg-indigo-400 disabled:cursor-not-allowed"
        type="submit"
      >
        Resend code
      </button>
      {resent ? "Re-sent!" : null}
    </Form>
  </div>
}

export default function CodePage() {
  const actionData = useActionData<{ resent: boolean }>()
  return <CodeScreen resent={actionData?.resent ? "Resent!" : undefined} />
}

export function ErrorBoundary() {
  const error = useRouteError();
  const actionData = useActionData<{ resent: boolean }>()
  const resent = actionData?.resent
  if (isRouteErrorResponse(error)) {
    return <CodeScreen resent={resent ? "Resent!" : undefined}>
      Invalid code. Please try again. ({error.data?.message})
    </CodeScreen>
  }
}
