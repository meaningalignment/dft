import { CanonicalValuesCard, PrismaClient, ValuesCard } from "@prisma/client"
import { cowpunkify } from "cowpunk-auth"

export const db = new PrismaClient()

export const auth = cowpunkify({
  site: "Democratic Fine-Tuning",
  loginFrom: "Democratic Fine-Tuning <info@meaningalignment.org>",
  users: db.user,
  emailCodes: db.emailCodes,
})
