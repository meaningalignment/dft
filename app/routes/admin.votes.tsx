import { NavLink, Outlet } from "@remix-run/react"
import { cases } from "~/lib/case"

export default function AdminVotes() {
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
                <div>{c.text}</div>
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
