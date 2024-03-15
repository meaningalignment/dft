import { cssBundleHref } from "@remix-run/css-bundle"
import {
  json,
  SerializeFrom,
  type LinksFunction,
  type LoaderArgs,
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
import styles from "./tailwind.css"
import { auth, db } from "./config.server"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { User, ValuesCard } from "@prisma/client"
import { Toaster } from "react-hot-toast"
import { Analytics } from "@vercel/analytics/react"
import React, { useEffect } from "react"
import { ValueStyle, dftStyle, personalStyle } from "./values-tools/value-styles"
import { StyleContext } from "~/context/style"


export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: styles },
]

export async function loader({ request }: LoaderArgs) {
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

  const valueStyle = process.env.VALUES_STYLE === "chatgpt" ? dftStyle : personalStyle

  return json({ user, values, valueStyle })
}

export function useCurrentUser(): User | null {
  const { user } = useRouteLoaderData("root") as SerializeFrom<typeof loader>
  return user
}

export function useCurrentUserValues(): ValuesCard[] | null {
  const { values } = useRouteLoaderData("root") as SerializeFrom<typeof loader>
  return values
}

export function useValueStyle(): ValueStyle {
  const { valueStyle } = useRouteLoaderData("root") as SerializeFrom<typeof loader>
  return valueStyle
}

export default function App() {

  useEffect(() => {
    console.log("App load")
  }, [])
  return (
    <StyleContext.Provider value={{ valueStyle: useValueStyle() }}>
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
            <React.Suspense>
              <Toaster />
            </React.Suspense>
            <ScrollRestoration />
            <Scripts />
            <LiveReload />
            <Analytics />
          </body>
        </html>
      </TooltipProvider>
    </StyleContext.Provider>
  )
}
