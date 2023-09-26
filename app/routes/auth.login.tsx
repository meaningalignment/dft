import { useEffect, useState } from "react"
import { ActionFunctionArgs, json } from "@remix-run/node"
import { Form, useActionData, useSearchParams } from "@remix-run/react"
import { auth } from "~/config.server"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Loader2 } from "lucide-react"
import { ExternalLink } from "~/components/external-link"
import va from "@vercel/analytics"

export async function action(args: ActionFunctionArgs) {
  try {
    return await auth.loginSubmitAction(args)
  } catch (error: any) {
    // Handle errors in client.
    return json({ error: error.message }, { status: 500 })
  }
}

export default function LoginScreen() {
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  const [email, setEmail] = useState<string>("")
  const actionData = useActionData<typeof action>()

  const redirect = searchParams.get("redirect") as string

  useEffect(() => {
    if (actionData?.error) {
      setShowError(true)
      setIsLoading(false)
      setEmail("")

      const timeout = setTimeout(() => setShowError(false), 5_000)
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [actionData])

  return (
    <div className="grid h-screen place-items-center p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Get Started</h1>
          <p className="text-sm text-muted-foreground">
            We'll send you an email with a login code.
          </p>
        </div>
        <div className="grid gap-6">
          <Form method="post" onSubmit={() => setIsLoading(true)}>
            <input type="hidden" name="redirect" value={redirect || ""} />
            <input type="hidden" name="autoregister" value="YES" />
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                />
              </div>

              <Button
                disabled={isLoading}
                type="submit"
                onClick={() => va.track("Sign In Clicked")}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In with Email
              </Button>
            </div>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Built by the{" "}
          <ExternalLink href="https://meaningalignment.institute">
            Institute for Meaning Alignment
          </ExternalLink>
          .
        </p>
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
