import type { V2_MetaFunction } from "@remix-run/node"
import { useNavigate } from "@remix-run/react"
import { useEffect } from "react"
import { useCurrentUser } from "../root"

export const meta: V2_MetaFunction = () => {
  return [
    { title: "Democratic Fine-tuning" },
    { name: "description", content: "Welcome to DFT!" },
  ]
}

export default function Index() {
  const user = useCurrentUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate("/auth/login")
    } else {
      navigate("/start")
    }
  }, [user, navigate])

  return null
}
