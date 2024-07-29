import {
  OpenAI,
} from "openai"
import { db, dialogueEvaluatorConfig, inngest } from "~/config.server"
import { normalizeMessage } from "../services/articulator"
import { Chat, Prisma } from "@prisma/client"
import crypto from "crypto"
import { ChatCompletionMessage } from "openai/resources"

export interface DialogueEvaluatorConfig {
  where: Prisma.ChatWhereInput
}

function evaluatorMetadata() {
  const hash = crypto.createHash("sha256")
  hash.update(JSON.stringify({ evaluationPrompt, evaluateDialogueFunction }))
  return {
    evaluatorHash: hash.digest("hex"),
    gitHash: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  }
}

export async function evaluateTranscript(chat: Chat) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const transcript = (chat?.transcript ??
    []) as any as ChatCompletionMessage[]
  const messages = transcript.map(normalizeMessage).slice(1)
  const res = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: evaluationPrompt,
      },
      ...messages,
    ],
    function_call: {
      name: "evaluate_dialogue",
    },
    functions: [evaluateDialogueFunction],
  })
  const result = JSON.parse(res.choices[0].message!.function_call!.arguments)
  result.metadata = evaluatorMetadata()
  return result
}

export const evaluateDialogues = inngest.createFunction(
  { name: "Evaluate dialogues" },
  { cron: "0 * * * *" },
  async ({ logger }) => {
    const newDialogue = await db.chat.findFirst({
      where: dialogueEvaluatorConfig.where,
    })

    if (!newDialogue) {
      logger.info("No new dialogues to evaluate.")
      return
    }

    logger.info(`Evaluating ${newDialogue.id}.`)
    const response = await evaluateTranscript(newDialogue)

    await db.chat.update({
      where: { id: newDialogue.id },
      data: {
        evaluation: response,
      },
    })

    const message = `Evaluation of ${newDialogue.id} is ${JSON.stringify(
      response
    )}.`
    logger.info(message)
    return { message }
  }
)

const evaluateDialogueFunction = {
  name: "evaluate_dialogue",
  parameters: {
    type: "object",
    properties: {
      dialogue_meaningful_story: {
        description:
          "Did the assistant get a personal story? Was it meaningful?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      dialogue_wisdom: {
        description:
          "Was the user educated about the relationship between their experience of meaning and their own wisdom?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      dialogue_perspective: {
        description: "Did the user get a new perspective?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      dialogue_leading: {
        description:
          "Did the assistant avoid 'leading the witness' by putting words in the users' mouth?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      dialogue_one_question: {
        description: "Did the assistant ask one question at a time?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      values_card_one_source: {
        description:
          "Is there one source of meaning that goes through the whole dialogue?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      values_card_really_source: {
        description: "Is it really a source of meaning? (See definition)",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      values_card_coherent: {
        description:
          "Do the evaluation criteria make sense as a coherent whole?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      values_card_clear: {
        description: "Are the evaluation criteria clear and specific?",
        type: "string",
        enum: ["A", "B", "C", "D", "F"],
      },
      worst_score: {
        description:
          "Lowest grade given for any criterion above, or 'INCOMPLETE' if the dialogue does not call show_values_card or articulate_values_card.",
        type: "string",
        enum: ["A", "B", "C", "D", "F", "INCOMPLETE"],
      },
    },
    required: ["worst_score"],
  },
}

const sourceOfMeaningDefinition = `A "source of meaning" is a concept similar to a value – it is a way of living that is important to you. Something that you pay attention to in a choice. They are more specific than words like "honesty" or "authenticity". They specify a particular *kind* of honesty and authenticity, specified as a path of attention.

A source of meaning is distinct from similar concepts:
- A source of meaning is not a goal. A goal is something you want to achieve, like "become a doctor" or "get married". A source of meaning is a way of living, like "be a good friend" or "be a good listener".
- A source of meaning is not a moral principle. A source of meaning is not a rule that you think everyone should follow. It is a way of living that is important to the user, but not necessarily to others.
- A source of meaning is not a norm or a social expectation. A source of meaning is not something you do because you feel like you have to, or because you feel like you should. It is something the user does because it is intrinsically important to them.
- A source of meaning is not an internalized norm – a norm the user has adopted outside of the original social context. It is a way of living that produces a sense of meaning for you, not a way of living that you think is "right" or "correct".`

const evaluationPrompt = `
I will send a dialogue.

If the dialogue does not include a call to show_values_card or articulate_values_card, give it a grade of "INCOMPLETE" and skip the rest of the evaluation.

Otherwise, rate it according to the following criteria:

About the dialogue itself:

- Did the assistant get a personal story from the user? Was it a story with meaningfulness? ("F" if no such story.)
- Did the user learn something about the relationship between their experience of meaning and their own wisdom? ("F" if unsure.)
- Did the user get a new perspective on themselves? ("F" if unsure.)
- Did the assistant avoid 'leading the witness' by putting words in the users' mouth?
- Did the assistant ask one question at a time?

About the values card produced (all should fail if show_values_card was not called):

- Is there one source of meaning that goes through the whole dialogue?
- Is it really a source of meaning? (See definition below)
- Do the card's evaluation criteria make sense as a coherent whole?
- Are the card's evaluation criteria clear and specific?

With each aspect, only give an "A" if the assistant has done an exceptional job. If the assistant has done a good job, give a "B". If the assistant has done an average job, give a "C". If the assistant has done a poor job, give a "D". If the assistant did not manage to do the task at all, give an "F".

# Definition of Source of Meaning

${sourceOfMeaningDefinition}
`
