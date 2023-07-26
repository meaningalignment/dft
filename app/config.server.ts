import { PrismaClient } from "@prisma/client"
import { cowpunkify } from "cowpunk-auth"

export const db = new PrismaClient()

export const auth = cowpunkify({
  site: "Democratic Fine-tuning",
  loginFrom: "Login Codes <info@meaningalignment.org>",
  users: db.user,
  emailCodes: db.emailCodes,
})
