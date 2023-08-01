import {
  Form,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useRouteError,
  useSearchParams,
} from "@remix-run/react"
import { LoaderArgs, ActionArgs } from "@remix-run/node/dist"
import { ReactNode, useEffect, useState } from "react"
import { auth } from "~/config.server"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"

export async function loader(args: LoaderArgs) {
  return await auth.codeLoader(args)
}

export async function action(args: ActionArgs) {
  return await auth.codeSubmitAction(args)
}

function CodeScreen({
  children,
  resent,
}: {
  children?: ReactNode
  resent?: string
}) {
  const [canResend, setCanResend] = useState<boolean>(false)
  const [searchParams] = useSearchParams()
  const { LOGIN_EMAIL_FROM } = useLoaderData<typeof loader>()
  useEffect(() => {
    const timeout = setTimeout(() => setCanResend(true), 10_000)
    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const email = searchParams.get("email") as string | undefined
  const successRedirect = searchParams.get("successRedirect") as string

  return (
    <div className="grid h-screen place-items-center justify-around">
      <div className="flex flex-col justify-around space-x-4">
        <Form method="post" className="flex flex-col gap-2 pt-12">
          <h1>
            {children || (
              <div className="mb-2">
                <p className="text-lg font-medium ">
                  Please check your email for a six digit code
                </p>
                <p className="text-sm text-muted-foreground">
                  (Look for an email from {LOGIN_EMAIL_FROM})
                </p>
              </div>
            )}
          </h1>
          <input type="hidden" name="type" value="code" />
          <input type="hidden" name="email" value={email} />
          {successRedirect ? (
            <input
              type="hidden"
              name="successRedirect"
              value={successRedirect}
            />
          ) : null}
          <Input placeholder="Six digit code" name="code" />
          <Button type="submit">Submit</Button>
        </Form>
        <div className="flex justify-center items-center mt-12">
          <Form method="post" style={{ marginLeft: 0 }}>
            <input type="hidden" name="resend" value="yes" />
            <input type="hidden" name="email" value={email} />
            <Button disabled={!canResend} variant={"outline"} type="submit">
              Resend code
            </Button>
            {resent ? "Re-sent!" : null}
          </Form>
        </div>
      </div>
    </div>
  )
}

export default function CodePage() {
  const actionData = useActionData<{ resent: boolean }>()
  return <CodeScreen resent={actionData?.resent ? "Resent!" : undefined} />
}

export function ErrorBoundary() {
  const error = useRouteError()
  const actionData = useActionData<{ resent: boolean }>()
  const resent = actionData?.resent

  if (isRouteErrorResponse(error)) {
    return (
      <CodeScreen resent={resent ? "Resent!" : undefined}>
        Invalid code. Please try again. ({error.data?.message})
      </CodeScreen>
    )
  }
}
