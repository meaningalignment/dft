import { Outlet } from "@remix-run/react";
import AdminHeader from "~/components/admin-header";

export default function Admin() {
  return <>
    <AdminHeader />
    <Outlet />
  </>
}