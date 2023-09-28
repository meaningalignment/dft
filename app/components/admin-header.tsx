import { NavLink as RemixNavLink } from "@remix-run/react"

function NavLink({ children, ...props }: any) {
  return (
    <RemixNavLink
      {...props}
      className={({ isActive }) =>
        `${isActive ? "text-zinc-800" : "text-zinc-400"} hover:text-zinc-500`
      }
    >
      {children}
    </RemixNavLink>
  )
}

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-start gap-3 w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <b className="text-lg mr-2">Admin</b>
      <NavLink to="/admin/cards">Cards</NavLink>
      <NavLink to="/admin/merge">Merge</NavLink>
      <NavLink to="/admin/chats">Chats</NavLink>
      <NavLink to="/admin/links">Links</NavLink>
      <NavLink to="/admin/votes">Votes</NavLink>
      <NavLink to="/admin/upgrades">Upgrades</NavLink>
    </header>
  )
}
