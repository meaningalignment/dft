import { json } from "@remix-run/node"
import { NavLink, Outlet, useLoaderData } from "@remix-run/react"
import { db } from "~/config.server"

export const loader = async () => {
  const cases = await db.case.findMany()
  return json({ cases })
}

export default function AdminVotes() {
  const { cases } = useLoaderData<typeof loader>() 

  return (
    <div className="grid grid-cols-5">
      <div className="col-span-1 border-r h-screen overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4 px-4 py-2">Votes</h1>
        <ul>
          {cases.map((c) => (
            <NavLink
              to={`/admin/votes/${c.id}`}
              key={c.id}
              className={({ isActive, isPending }) =>
                isPending
                  ? "block bg-slate-100"
                  : isActive
                  ? "block bg-slate-200"
                  : ""
              }
            >
              <li
                key={c.id}
                className="border-b border-gray-300 py-2 px-4 py-2 "
              >
                <div className="font-bold">{c.title}</div>
                <div>{c.question}</div>
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
