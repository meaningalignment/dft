import { ActionFunctionArgs, redirect } from "@remix-run/node"
import { Form, useSearchParams } from "@remix-run/react"
import { auth, db } from "~/config.server"
import { ExternalLink } from "~/components/external-link"
import { User } from "@prisma/client"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import va from "@vercel/analytics"
import { Loader2 } from "lucide-react"

/**
 * This action creates a user without any confirmation.
 *
 * It is needed for Prolific since we don't have a way to send them a login code.
 * Should be deactivated when not running a prolific study (remove the env var)
 */
export async function action({ request }: ActionFunctionArgs) {
  if (process.env.PROLIFIC_SIGNUP_ENABLED !== "true") {
    throw new Error("Prolific signup attempted but is not enabled.")
  }

  const formData = await request.formData()
  const prolificId = formData.get("prolificId") as string
  const sessionId = formData.get("sessionId") as string
  const studyId = formData.get("studyId") as string

  // See if the prolific user already exists.
  let user = (await db.user.findFirst({
    where: { prolificId },
  })) as User | null

  // If not, create one.
  if (!user) {
    console.log("Creating new Prolific user for ID " + prolificId)

    user = await db.user.create({
      data: {
        email: prolificId,
        signupType: "PROLIFIC",
        prolificId,
      },
    })
  }

  console.log(
    `Prolific signup complete. User ID: ${user.id} Prolific ID: ${prolificId} Prolific Study ID: ${studyId} Prolific Session ID: ${sessionId}`
  )

  // Log in the user.
  const session = await auth.storage.getSession()
  session.set("userId", user.id)
  session.set("email", prolificId)
  session.set("roles", [...(user.role || [])])

  return redirect("/", {
    headers: {
      "Set-Cookie": await auth.storage.commitSession(session),
    },
  })
}

export default function ProlificScreen() {
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const prolificId = searchParams.get("PROLIFIC_PID") as string
  const studyId = searchParams.get("STUDY_ID") as string
  const sessionId = searchParams.get("SESSION_ID") as string

  return (
    <div className="grid h-screen place-items-center p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-xs">
        <div className="my-8 p-8 border-2 border-border rounded-xl text-center">
          <h1 className="text-2xl mb-8">
            This process will take about 16 minutes to complete.
          </h1>
          <p className="text-neutral-500">
            Your Prolific completion code will be provided after the final step.
          </p>
        </div>
        <div className="grid justify-center items-center">
          <Form method="post" onSubmit={() => setIsLoading(true)}>
            <input type="hidden" name="prolificId" value={prolificId} />
            <input type="hidden" name="studyId" value={studyId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <Button
              type="submit"
              className="mx-auto"
              disabled={isLoading}
              onClick={() =>
                va.track("Signup With Prolific", {
                  prolificId,
                  studyId,
                })
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Click to Get Started
            </Button>
          </Form>
        </div>
      </div>
    </div>
  )
}
