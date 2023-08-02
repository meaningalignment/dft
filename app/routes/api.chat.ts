import { Configuration, OpenAIApi } from "openai-edge"
import { ActionArgs, ActionFunction, Session } from "@remix-run/node"
import {
  functions,
  systemPrompt,
  articulationPrompt,
  ValuesCardCandidate,
  formatCard,
} from "~/lib/consts"
import { ChatCompletionRequestMessage } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "../lib/openai-stream"
import { capitalize } from "~/utils"
import { auth, db } from "~/config.server"

// import { OpenAIStream, StreamingTextResponse } from "ai"   TODO replace the above import with this once https://github.com/vercel-labs/ai/issues/199 is fixed.

export const runtime = "edge"

const model = "gpt-4-0613"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

export type ArticulateCardFunction = {
  name: string
  arguments: {}
}

export type SubmitCardFunction = {
  name: string
  arguments: {
    title: string
    instructions_short: string
    instructions_detailed: string
  }
}

export type ArticulateCardResponse = {
  values_card: ValuesCardCandidate
  critique?: string | null
}

//
// Vercel AI openai functions handling is broken in Remix. The `experimental_onFunctionCall` provided by the `ai` package does not work.
//
// We have to handle them manually, until https://github.com/vercel-labs/ai/issues/199 is fixed.
// This is done by listening to the first token and seeing if it is a function call.
// If so, wait for the whole response and handle the function call.
// Otherwise, return the stream as-is.
//
async function getFunctionCallFromStreamResponse(
  res: Response
): Promise<ArticulateCardFunction | SubmitCardFunction | null> {
  const stream = OpenAIStream(res.clone()) // .clone() since we don't want to consume the response.
  const reader = stream.getReader()

  //
  // In the case of a function call, the first token in the stream
  // is an unfinished JSON object, with "function_call" as the first key.
  //
  // We can use that key to check if the response is a function call.
  //
  const { value: first } = await reader.read()

  const isFunctionCall = first
    ?.replace(/[^a-zA-Z0-9_]/g, "")
    ?.startsWith("function_call")

  if (!isFunctionCall) {
    return null
  }

  //
  // Function arguments are streamed as tokens, so we need to
  // read the whole stream, concatenate the tokens, and parse the resulting JSON.
  //
  let result = first

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    result += value
  }

  //
  // Return the resulting function call.
  //
  const json = JSON.parse(result)["function_call"]

  // This is needed due to tokens being streamed with escape characters.
  json["arguments"] = JSON.parse(json["arguments"])

  return json as ArticulateCardFunction | SubmitCardFunction
}

/** Create a values card from a transcript of the conversation. */
async function articulateValuesCard(
  messages: ChatCompletionRequestMessage[],
  previousCard: ValuesCardCandidate | null
): Promise<ArticulateCardResponse> {
  console.log("Articulating values card...")

  let transcript = messages
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m) => `${capitalize(m.role)}: ${m.content}`)
    .join("\n")

  if (previousCard) {
    transcript += `Previous card: ${JSON.stringify(previousCard)}`
  }

  const res = await openai.createChatCompletion({
    model,
    messages: [
      { role: "system", content: articulationPrompt },
      { role: "user", content: transcript },
    ],
    functions: [formatCard],
    function_call: { name: formatCard.name },
    temperature: 0.0,
    stream: false,
  })

  const data = await res.json()
  const response = JSON.parse(
    data.choices[0].message.function_call.arguments
  ) as ArticulateCardResponse

  return response
}

async function submitValuesCard(
  card: ValuesCardCandidate,
  chatId: string
): Promise<string> {
  console.log(`Submitting values card:\n\n${JSON.stringify(card)}`)

  // Save the card in the database.
  await db.valuesCard
    .create({
      data: {
        title: card.title,
        instructionsShort: card.instructions_short,
        instructionsDetailed: card.instructions_detailed,
        evaluationCriteria: card.evaluation_criteria,
        chatId,
      },
    })
    .catch((e) => console.error(e))

  return `<the values card (´${card.title}) was submitted. The user has now submitted 1 value in total. Proceed to thank the user for submitting their value.>`
}

async function createHeaders(
  session: Session,
  articulatedCard?: ValuesCardCandidate | null,
  submittedCard?: ValuesCardCandidate | null
): Promise<{ [key: string]: string }> {
  const headers: { [key: string]: string } = {
    "Set-Cookie": await auth.storage.commitSession(session),
  }

  if (articulatedCard) {
    headers["X-Articulated-Card"] = JSON.stringify(articulatedCard)
  }

  if (submittedCard) {
    headers["X-Submitted-Card"] = JSON.stringify(submittedCard)
  }

  return headers
}

/** Call the right function and return the resulting stream. */
async function streamingFunctionCallResponse(
  func: ArticulateCardFunction | SubmitCardFunction,
  messages: any[] = [],
  session: Session,
  chatId: string
): Promise<StreamingTextResponse> {
  //
  // Call the right function.
  //
  let result: string = ""
  let articulatedCard: ValuesCardCandidate | null = null
  let submittedCard: ValuesCardCandidate | null = null

  switch (func.name) {
    case "articulate_values_card": {
      // Get the previously articulated card from the session.
      if (session.has("values_card")) {
        articulatedCard = JSON.parse(
          session.get("values_card")
        ) as ValuesCardCandidate
      }

      // Articulate the values card.
      const res = await articulateValuesCard(messages, articulatedCard)

      if (res.critique) {
        result = `<A card was articulated, but it is not yet meeting the guidelines. The following critique was receieved: "${res.critique}". Continue the dialogue with the user until you are able to solve for the critique.>`
      } else {
        articulatedCard = res.values_card

        // Save the card in the session.
        session.set("values_card", JSON.stringify(articulatedCard))

        result = `<A card (${articulatedCard.title}) was articulated and shown to the user. The preview of the card is shown in the UI, no need to repeat it here. The user can now choose to submit the card.>`
      }

      break
    }
    case "submit_values_card": {
      // Get the values card from the session.
      if (!session.has("values_card")) {
        throw Error("No values card in session")
      }

      submittedCard = JSON.parse(
        session.get("values_card")
      ) as ValuesCardCandidate

      // Submit the values card.
      result = await submitValuesCard(submittedCard, chatId)

      // Update the session.
      session.unset("values_card")

      break
    }
    default: {
      throw new Error("Unknown function call: " + func.name)
    }
  }

  console.log(`Result from "${func.name}":\n${result}`)

  //
  // Call the OpenAI API with the function result.
  //
  // This wraps the raw function result in a generated message that fits the flow
  // of the conversation.
  //
  const res = await openai.createChatCompletion({
    model,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: null,
        function_call: {
          name: func.name,
          arguments: JSON.stringify(func.arguments), // API expects a string.
        },
      },
      {
        role: "function",
        name: func.name,
        content: result,
      },
    ],
    temperature: 0.0,
    functions,
    function_call: "none", // Prevent recursion.
    stream: true,
  })

  return new StreamingTextResponse(OpenAIStream(res), {
    headers: await createHeaders(session, articulatedCard, submittedCard),
  })
}

export const action: ActionFunction = async ({
  request,
}: ActionArgs): Promise<Response> => {
  const session = await auth.storage.getSession(request.headers.get("Cookie"))
  const userId = await auth.getUserId(request)
  const json = await request.json()

  let { messages, chatId, function_call } = json

  // Clear values card from previous session.
  if (messages.length === 2) {
    session.unset("values_card")
  }

  // Prepend the system message.
  messages = [{ role: "system", content: systemPrompt }, ...messages]

  // Save the transcript in the database in the background.
  const updateDbPromise = db.chat
    .upsert({
      where: { id: chatId },
      update: { transcript: messages },
      create: {
        id: chatId,
        transcript: messages,
        userId,
      },
    })
    .catch((e) => console.error(e))


  // Create stream for next chat message.
  const completionPromise = openai.createChatCompletion({
    model,
    messages: messages,
    temperature: 0.7,
    stream: true,
    functions,
    function_call: function_call ?? "auto",
  })

  // Wait for both the database update and the OpenAI API call to finish.
  const [res, _] = await Promise.all([completionPromise, updateDbPromise])

  if (!res.ok) {
    const body = await res.json()
    throw body.error
  }

  // If a function call is present in the stream, handle it...
  const func = await getFunctionCallFromStreamResponse(res)

  if (func) {
    return streamingFunctionCallResponse(func, messages, session, chatId)
  }

  // ...otherwise, return the response.
  return new StreamingTextResponse(OpenAIStream(res), {
    headers: await createHeaders(session),
  })
}
