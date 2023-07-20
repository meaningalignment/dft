import { useCurrentUser } from "~/root"
import { Button } from "./ui/button"

export default function Header() {
  const user = useCurrentUser()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex-grow" />
      <div className="flex items-center justify-end space-x-4">
        <p className="text-sm text-gray-400">{user?.email}</p>
        <form action="/auth/logout" method="post">
          <Button variant={"outline"}>Sign Out</Button>
        </form>
      </div>
    </header>
  )
}
