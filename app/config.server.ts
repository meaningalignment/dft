import { PrismaClient, Prisma } from "@prisma/client"
import { cowpunkify } from "cowpunk-auth"
import { Inngest } from "inngest"
import { OpenAI } from "openai"
// import { ArticulatorConfig } from "./values-tools/articulator-config"
// import dftDefaultConfig from "./values-tools/articulator-configs/dft-default"
// import dftGeneralConfig from "./values-tools/articulator-configs/dft-general"
import { redirect } from "@remix-run/node"

export const db = new PrismaClient()

export const auth = cowpunkify({
  site: "Democratic Fine-Tuning",
  loginFrom: "Democratic Fine-Tuning <info@meaningalignment.org>",
  users: db.user,
  emailCodes: db.emailCodes,
})

export async function ensureLoggedIn(request: Request, extraParams = {}) {
  const userId = (await auth.getUserId(request)) as number | undefined
  if (!userId) {
    const params = new URLSearchParams({
      redirect: request.url,
      ...extraParams,
    })
    throw redirect(`/auth/login?${params.toString()}`)
  } else {
    return userId
  }
}

export const inngest = new Inngest({
  name: process.env.INNGEST_NAME ?? "Democratic Fine-Tuning",
  apiKey: process.env.INNGEST_API_KEY,
  eventKey: process.env.INNGEST_EVENT_KEY,
})

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const isChatGpt = process.env.VALUE_STYLE !== "personal"

export const dialogueEvaluatorConfig = {
  where: {
    evaluation: {
      equals: Prisma.DbNull,
    },
    user: {
      isAdmin: {
        not: {
          equals: true,
        },
      },
    },
    copiedFromId: {
      equals: null,
    },
  },
}