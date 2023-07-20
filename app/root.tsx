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
  return json({ user })
}

export function useCurrentUser(): User | null {
  const { user } = useRouteLoaderData("root") as SerializeFrom<typeof loader>
  return user
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="widt=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}
