import {
  json,
  SerializeFrom,
  type LoaderFunctionArgs,
} from "@remix-run/node"
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "@remix-run/react"
import { auth, db } from "./config.server"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { User, ValuesCard } from "@prisma/client"
import { Analytics } from "@vercel/analytics/react"
import React, { useEffect } from "react"

import "~/tailwind.css"

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await auth.getUserId(request)

  const user =
    userId &&
    ((await db.user.findUnique({
      where: { id: userId },
    })) as User | null)

  const values =
    userId &&
    ((await db.valuesCard.findMany({
      where: { chat: { userId } },
    })) as ValuesCard[] | null)

  return json({ user, values })
}

export function useCurrentUser(): User | null {
  const { user } = useRouteLoaderData("root") as SerializeFrom<typeof loader>
  return user
}

export function useCurrentUserValues(): ValuesCard[] | null {
  const { values } = useRouteLoaderData("root") as SerializeFrom<typeof loader>
  return values
}

export default function App() {
  useEffect(() => {
    console.log("App load")
  }, [])
  return (
      <TooltipProvider>
        <html lang="en">
          <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <Meta />
            <Links />
          </head>
          <body className="bg-slate-50">
            <Outlet />
            <ScrollRestoration />
            <Scripts />
            <LiveReload />
            <Analytics />
          </body>
        </html>
      </TooltipProvider>
  )
}
