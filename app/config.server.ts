import { PrismaClient, Prisma } from "@prisma/client"
import { cowpunkify } from "cowpunk-auth"
import { Inngest } from "inngest"
import { Configuration, OpenAIApi } from "openai-edge"
import { DialogueEvaluatorConfig } from "./values-tools/dialogue-evaluator"
import { ArticulatorConfig } from "./values-tools/articulator-config"
import dftDefaultConfig from "./values-tools/articulator-configs/dft-default"

export const db = new PrismaClient()

export const auth = cowpunkify({
  site: "Democratic Fine-Tuning",
  loginFrom: "Democratic Fine-Tuning <info@meaningalignment.org>",
  users: db.user,
  emailCodes: db.emailCodes,
})

export const inngest = new Inngest({
  name: "Democratic Fine-Tuning",
  apiKey: process.env.INNGEST_API_KEY,
})

export const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
)

export const dialogueEvaluatorConfig: DialogueEvaluatorConfig = {
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

export const articulatorConfigs: { [key: string]: ArticulatorConfig } = {
  default: dftDefaultConfig,
}
