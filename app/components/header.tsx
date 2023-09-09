import { User } from "@prisma/client"
import { useCurrentUser } from "../root"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Form } from "@remix-run/react"
import { useRef } from "react"

function UserMenu({ user }: { user: User }) {
  const formRef = useRef(null)

  const handleSubmit = () => {
    const ref = formRef.current as any
    ref?.submit()
  }

  return (
    <div className="flex items-center justify-between">
      <Form method="post" action="/auth/logout" ref={formRef}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-0">
              <span className="ml-2">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            sideOffset={8}
            align="start"
            className="w-[200px]"
          >
            <DropdownMenuItem className="flex-col items-start">
              <div className="text-xs text-zinc-500">{user?.email}</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={handleSubmit}>
              <button>Sign Out</button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Form>
    </div>
  )
}

export default function Header({ chatId, articulatorConfig }: { chatId?: string, articulatorConfig?: string }) {
  const user = useCurrentUser()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      {chatId && <p className="text-xs text-gray-400">{chatId}</p>}
      <div className="flex-grow" />
      {
        articulatorConfig && articulatorConfig !== 'default' && (
          <p className="text-xs text-gray-400">{articulatorConfig}</p>
        )
      }
      <div className="flex items-center justify-end">
        {user && <UserMenu user={user} />}
      </div>
    </header>
  )
}
