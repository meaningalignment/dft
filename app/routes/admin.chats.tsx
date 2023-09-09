import { LoaderArgs, json } from "@remix-run/node"
import { NavLink, Outlet, useLoaderData } from "@remix-run/react"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chats = await db.chat.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      copiedFromId: true,
      evaluation: true,
      articulatorPromptHash: true,
      articulatorPromptVersion: true,
      gitCommitHash: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return json({ chats })
}

export default function AdminChats() {
  const data = useLoaderData<typeof loader>()
  return (
    <div className="grid grid-cols-5">
      <div className="col-span-1 border-r h-screen overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4 px-4 py-2">Chats</h1>
        <ul>
          {data.chats.map((chat) => (
            <NavLink
              to={`/admin/chats/${chat.id}`}
              key={chat.id}
              className={({ isActive, isPending }) =>
                isPending
                  ? "block bg-slate-100"
                  : isActive
                  ? "block bg-slate-200"
                  : ""
              }
            >
              <li
                key={chat.id}
                className="border-b border-gray-300 py-2 px-4 py-2 "
              >
                <div>{chat.user.name}</div>
                <div>{chat.user.email}</div>
                <div className="text-xs text-neutral-500">{chat.createdAt}</div>
                {chat.evaluation && (
                  <div>
                    <span className="text-sm text-red-500">
                      {(chat.evaluation as any).worst_score}
                    </span>{" "}
                    -{" "}
                    <span className="text-xs text-green">
                      {chat.articulatorPromptHash.slice(0, 8)}
                    </span>
                  </div>
                )}
                {chat.copiedFromId && (
                  <div className="text-xs font-bold mt-2 text-neutral-500">
                    Copied from {chat.copiedFromId}
                  </div>
                )}
              </li>
            </NavLink>
          ))}
        </ul>
      </div>
      <div className="col-span-4 border-l my-4">
        <Outlet />
      </div>
    </div>
  )
}
