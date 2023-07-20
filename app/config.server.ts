import { PrismaClient } from '@prisma/client'
import { cowpunkify } from 'cowpunk-auth'

export const db = new PrismaClient()

export const auth = cowpunkify({
  site: 'Democratic Fine-tining',
  loginFrom: "Login Codez <info@meaningalignment.org>",
  users: db.user,
  emailCodes: db.emailCodes,
})
