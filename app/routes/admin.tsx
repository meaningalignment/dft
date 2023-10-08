import { Outlet } from "@remix-run/react";
import AdminHeader from "~/components/admin-header";
import { useCurrentUser } from "~/root";

function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-4xl font-bold mb-2">Not authorized</div>
      <div className="text-xl">Please log in as an admin</div>
    </div>
  )
}

export default function Admin() {
  const user = useCurrentUser();

  if (!user || !user.isAdmin) {
    return <NotAuthorized />
  }

  return <>
    <AdminHeader />
    <Outlet />
  </>
}