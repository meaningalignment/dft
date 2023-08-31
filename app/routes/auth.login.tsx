import { useState } from "react"
import { ActionArgs } from "@remix-run/node"
import { Form, Link, useRouteError, useSearchParams } from "@remix-run/react"
import { auth, db } from "~/config.server"
import { Button, buttonVariants } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Loader2 } from "lucide-react"
import { ExternalLink } from "~/components/external-link"

export async function action(args: ActionArgs) {
  //
  // Cowpunk auth requires a "register" flag for new users.
  // Since we are merging signup & login here, we need to
  // manually set the "register" flag if the user is new.
  //
  const data = await args.request.formData()
  const email = data.get("email") as string
  const user = await db.user.findFirst({ where: { email } })

  console.log(user)

  if (!user) {
    data.append("register", "true")
  }

  const newFormData = new URLSearchParams()
  for (const [key, value] of data.entries()) {
    console.log("Adding key/value:", key, value)
    newFormData.append(key, value as string)
  }

  const newRequest = new Request(args.request, {
    body: newFormData.toString(),
    headers: args.request.headers,
  })

  // Call the submit action with the updated args.
  return await auth.loginSubmitAction({ ...args, request: newRequest })
}

type LoginScreenProps = {
  errorMessage?: string
}

function LoginForm({ redirect }: { redirect?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="grid gap-6">
      <Form method="post" onSubmit={() => setIsLoading(true)}>
        <input type="hidden" name="redirect" value={redirect || ""} />
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
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
            />
          </div>

          <Button disabled={isLoading} type="submit">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In with Email
          </Button>
        </div>
      </Form>
    </div>
  )
}

export default function LoginScreen(props: LoginScreenProps) {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect") as string

  return (
    <div className="grid h-screen place-items-center p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-sm">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Get Started</h1>
          <p className="text-sm text-muted-foreground">
            We'll send you an email with a login code.
          </p>
        </div>

        <LoginForm redirect={redirect} />

        <p className="text-center text-sm text-muted-foreground">
          Built by the{" "}
          <ExternalLink href="https://meaningalignment.institute">
            Institute for Meaning Alignment
          </ExternalLink>
          .
        </p>

        {props.errorMessage && (
          <div className="text-red-500 mt-6 w-full text-center">
            {props.errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  const error = useRouteError() as Error
  return <LoginScreen errorMessage={error.message} />
}
