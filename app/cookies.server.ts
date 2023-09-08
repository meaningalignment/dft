import { createCookie } from "@remix-run/node"
export const articulatorConfig = createCookie("articulatorConfig", {
  maxAge: 604_800, // one week
})
