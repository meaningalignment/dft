import { json } from "@remix-run/node"
import { NavLink, Outlet, useLoaderData } from "@remix-run/react"
import { db } from "~/config.server"
import { cn } from "~/utils"

export async function loader() {
  const edges = await db.edge.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      userId: true,
      createdAt: true,
      fromId: true,
      toId: true,
      comment: true,
      relationship: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return json({ edges })
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        status === "upgrade"
          ? "bg-green-100 text-green-800"
          : status === "not_sure"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800"
      )}
    >
      {status === "upgrade"
        ? "Upgrade"
        : status === "not_sure"
        ? "Not sure"
        : "No Upgrade"}
    </span>
  )
}

export default function AdminChats() {
  const data = useLoaderData<typeof loader>()
  return (
    <div className="grid grid-cols-5">
      <div className="col-span-1 border-r h-screen overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4 px-4 py-2">Links</h1>
        <ul>
          {data.edges.map((edge) => (
            <NavLink
              to={`/admin/links/${edge.userId}/${edge.fromId}/${edge.toId}`}
              key={edge.userId + edge.fromId + edge.toId}
              className={({ isActive, isPending }) =>
                isPending
                  ? "block bg-slate-100"
                  : isActive
                  ? "block bg-slate-200"
                  : ""
              }
            >
              <li
                key={edge.userId + edge.fromId + edge.toId}
                className="border-b border-gray-300 py-2 px-4 py-2 "
              >
                <div>{edge.user.name}</div>
                <div>{edge.user.email}</div>
                <div className="text-xs text-neutral-500">{edge.createdAt}</div>
                <StatusBadge status={edge.relationship} />
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
