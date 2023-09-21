import {
  Form,
  useActionData,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react"
import { useEffect, useState } from "react"
import { auth } from "~/config.server"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Loader2 } from "lucide-react"
import { IconCheck } from "~/components/ui/icons"
import { ActionArgs, json } from "@remix-run/node"
import va from "@vercel/analytics"

export async function action(args: ActionArgs) {
  try {
    return await auth.codeSubmitAction(args)
  } catch (error: any) {
    return json({ resent: false, error: error.message }, { status: 500 })
  }
}

export async function loader(args: ActionArgs) {
  return await auth.codeLoader(args)
}

export default function CodeScreen() {
  const [input, setInput] = useState<string>("")
  const [canResend, setCanResend] = useState<boolean>(false)
  const [isValidCode, setIsValidCode] = useState<boolean>(false)

  const { LOGIN_EMAIL_FROM } = useLoaderData<typeof loader>()

  const actionData = useActionData<{ resent: boolean; error?: string }>()
  const [showError, setShowError] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [searchParams] = useSearchParams()
  const email = searchParams.get("email") as string | undefined
  const successRedirect = searchParams.get("successRedirect") as string

  useEffect(() => {
    if (actionData?.error) {
      setIsLoading(false)
      setShowError(true)
      setInput("")

      const timeout = setTimeout(() => setShowError(false), 5_000)
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [actionData])

  useEffect(() => {
    const timeout = setTimeout(() => setCanResend(true), 5_000)
    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const onChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isRightLength = e.target.value.length === 6
    const isOnlyNumbers = e.target.value.match(/^[0-9]+$/) !== null

    setIsValidCode(isRightLength && isOnlyNumbers)
    setInput(e.target.value)
  }

  return (
    <div className="grid h-screen place-items-center p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your Inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            {`Look for an email from ${LOGIN_EMAIL_FROM}.`}
          </p>
        </div>
        <Form
          method="post"
          className="flex flex-col gap-2"
          onSubmit={() => setIsLoading(true)}
        >
          <input type="hidden" name="type" value="code" />
          <input type="hidden" name="email" value={email} />
          {successRedirect ? (
            <input
              type="hidden"
              name="successRedirect"
              value={successRedirect}
            />
          ) : null}
          <Input
            value={input}
            onChange={onChangeInput}
            placeholder="Six-digit code"
            inputMode="numeric"
            pattern="\d{6}"
            name="code"
          />
          <Button
            disabled={!isValidCode || isLoading}
            type="submit"
            onClick={() => va.track("Submitted Code")}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </Form>
        <div className="flex justify-center items-center mt-12">
          <Form method="post" style={{ marginLeft: 0 }}>
            <input type="hidden" name="resend" value="yes" />
            <input type="hidden" name="email" value={email} />
            {actionData?.resent ? (
              <p className="text-sm text-muted-foreground flex items-center">
                Resent
                <IconCheck className="ml-1 h-4 w-4 inline-block" />
              </p>
            ) : (
              <Button
                disabled={!canResend || isLoading}
                variant={"link"}
                type="submit"
              >
                Resend Code
              </Button>
            )}
          </Form>
        </div>
        <div
          className={`mt-6 w-full text-center transition-opacity duration-300 ease-in-out ${
            showError ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-red-500">{actionData?.error ?? "error"}</div>
        </div>
      </div>
    </div>
  )
}
