import { useState } from "react"
import { ActionArgs } from "@remix-run/node"
import { Form, useRouteError, useSearchParams } from "@remix-run/react"
import { auth } from "~/config.server"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Checkbox } from "~/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

export async function action(args: ActionArgs) {
  return await auth.loginSubmitAction(args)
}

type LoginScreenProps = {
  isNewUser?: boolean
  errorMessage?: string
}

export default function LoginScreen(props: LoginScreenProps) {
  const [newUser, setNewUser] = useState(props.isNewUser ?? false)
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect") as string

  return (
    <div className="grid h-screen place-items-center">
      <Form method="post" className="flex flex-col gap-2 pt-12 w-96">
        <div className="mb-2">
          <p className="text-lg font-medium ">Enter your email</p>
          <p className="text-sm text-muted-foreground">
            We'll send you a code you can use to log in.
          </p>
        </div>
        <input type="hidden" name="redirect" value={redirect || ""} />
        <Input placeholder="Your email here" type="email" name="email" />
        {newUser && <Input placeholder="Your name" type="name" name="name" />}

        <Button type="submit">Send Code</Button>
        <div className="items-top flex space-x-2 mt-2">
          <Checkbox
            name="register"
            checked={newUser}
            onCheckedChange={(isChecked: boolean) => setNewUser(isChecked)}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms1"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I'm a new user
            </label>
            <p className="text-sm text-muted-foreground">
              Create an account for me
            </p>
          </div>
        </div>

        {props.errorMessage && (
          <div className="text-red-500 mt-6 w-full center-text">
            {props.errorMessage}
          </div>
        )}
      </Form>
    </div>
  )
}

export function ErrorBoundary() {
  const error = useRouteError() as Error

  if (error.message === "User not found") {
    toast("User not found, please register.", {
      id: "user-not-found",
    })

    return <LoginScreen isNewUser={true} />
  }

  return <LoginScreen errorMessage={error.message} />
}
