import { Configuration, OpenAIApi } from "openai-edge"
import { ActionArgs, ActionFunction } from "@remix-run/node"
import { functions, systemPrompt, articulationPrompt } from "~/lib/consts"
import { ChatCompletionRequestMessage } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "../lib/openai-stream"
import { capitalize } from "~/utils"
// import { OpenAIStream, StreamingTextResponse } from "ai"   TODO replace the above import with this once https://github.com/vercel-labs/ai/issues/199 is fixed.

export const runtime = "edge"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

export type CreateCardFunction = {
  name: string
  arguments: {}
}

export type SubmitCardFunction = {
  name: string
  arguments: {
    values_card: string
  }
}

//
// Vercel AI openai functions handling is broken in Remix. The `experimental_onFunctionCall` provided by the `ai` package does not work.
//
// We have to handle them manually, until https://github.com/vercel-labs/ai/issues/199 is fixed.
// This is done by listening to the first token and seeing if it is a function call.
// If so, wait for the whole response and handle the function call.
// Otherwise, return the stream as-is.
//
async function getFunctionCall(
  res: Response
): Promise<CreateCardFunction | SubmitCardFunction | null> {
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

  return json as CreateCardFunction | SubmitCardFunction
}

/** Create a values card from a transcript of the conversation. */
async function createValuesCard(
  messages: ChatCompletionRequestMessage[]
): Promise<string> {
  const transcript = messages
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m) => `${capitalize(m.role)}: ${m.content}`)
    .join("\n")

  const message =
    "Here is a transcript. Return a values card summarizing the source of meaning that was discussed.\n\n" +
    transcript

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [
      { role: "system", content: articulationPrompt },
      { role: "user", content: message },
    ],
    temperature: 0.3,
  })

  const data = await res.json()
  const text = data.choices[0].message.content

  return JSON.stringify({
    values_card: text,
    display_instructions:
      "Show this values card to the user in precisely this format.", // If we only return the card itself, ChatGPT will freestyle-text it. Easier to be explicit here than messing with the system prompt.
  })
}

async function submitValuesCard(valuesCard: string): Promise<string> {
  // TODO - add card to server
  return "<the values card was submitted. The user has now submitted 1 value in total. Proceed to thank the user>"
}

/** Call the right function and return the resulting stream. */
async function streamingFunctionCallResponse(
  func: CreateCardFunction | SubmitCardFunction,
  messages: any[] = []
): Promise<StreamingTextResponse> {
  //
  // Call the right function.
  //
  let result: string = ""

  switch (func.name) {
    case "create_values_card": {
      result = await createValuesCard(messages)
      break
    }
    case "submit_values_card": {
      const valuesCard = (func as SubmitCardFunction).arguments.values_card
      result = await submitValuesCard(valuesCard)
      break
    }
    default: {
      throw new Error("Unknown function call: " + func.name)
    }
  }

  console.log("Result from function call:", result)

  //
  // Call the OpenAI API with the function result.
  //
  // This wraps the raw function result in a generated message that fits the flow
  // of the conversation.
  //
  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [
      ...messages,
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

  // Return the resulting stream.
  return new StreamingTextResponse(OpenAIStream(res))
}

export const action: ActionFunction = async ({
  request,
}: ActionArgs): Promise<Response> => {
  const json = await request.json()
  let { messages } = json

  // Prepend the system message.
  messages = [{ role: "system", content: systemPrompt }, ...messages]

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: messages,
    temperature: 0.7,
    stream: true,
    functions,
    function_call: "auto",
  })

  if (!res.ok) {
    const body = await res.json()
    throw body.error
  }

  // If a function call is present, handle it...
  const func = await getFunctionCall(res)
  if (func) {
    return streamingFunctionCallResponse(func, messages)
  }

  // ...otherwise, return the response.
  return new StreamingTextResponse(OpenAIStream(res))
}
