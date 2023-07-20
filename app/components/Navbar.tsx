import { useCurrentUser } from "~/root"

export default function Navbar() {
  const user = useCurrentUser()

  return (
    <nav className="flex items-center justify-between flex-wrap p-4">
      <div className="flex items-center flex-shrink-0 mr-6">
        <span className="font-semibold text-xl tracking-tight">DFT</span>
      </div>
      <div className="flex flex-row">
        <p className="inline-block text-sm px-4 py-2 leading-none">
          {user?.email}
        </p>
        <form action="/auth/logout" method="post">
          <button className="inline-block text-sm px-4 py-2 leading-none border rounded border">
            Sign Out
          </button>
        </form>
      </div>
    </nav>
  )
}
