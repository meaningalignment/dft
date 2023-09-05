import { LoaderArgs, json } from "@remix-run/node"
import { NavLink, Outlet, useLoaderData } from "@remix-run/react"
import { db } from "~/config.server"

export async function loader({ params }: LoaderArgs) {
  const chats = await db.chat.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      evaluation: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      }
    },
  })

  return json({ chats })
}

export default function AdminChats() {
  const data = useLoaderData<typeof loader>()
  return (
    <div className="grid grid-cols-5">
      <div className="col-span-1 border-r px-4 py-2 h-screen overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4" >Chats</h1>
        <ul>
          {data.chats.map((chat) => (
            <NavLink to={`/admin/chats/${chat.id}`} key={chat.id} className={({ isActive, isPending }) =>
              isPending
                ? "block bg-yellow-100"
                : isActive
                  ? "block bg-slate-200"
                  : ""
            }>
              <li key={chat.id} className="border-b border-gray-300 py-2">
                <div>{chat.user.name}</div>
                <div>{chat.user.email}</div>
                <div>{chat.createdAt}</div>
                {chat.evaluation && (
                  <div className="text-sm text-red-500">
                    {(chat.evaluation as any).worst_score}
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
