import { ChatCompletionFunctions, Configuration, OpenAIApi } from "openai-edge"
import { ActionArgs, ActionFunction } from "@remix-run/node"

//
// The Vercel "ai" package is broken for Remix.
// Below is a temporary fix from https://github.com/vercel-labs/ai/issues/199.
//
// The following code (until the "prompts" section)
// should be replaced with the classes from the "ai" package
// with the same names when above is fixed.
//

import { createEventStreamTransformer, trimStartOfStreamHelper } from "ai"
import { ReadableStream as PolyfillReadableStream } from "web-streams-polyfill"
import { createReadableStreamWrapper } from "@mattiasbuelens/web-streams-adapter"

// @ts-expect-error bad types
const toPolyfillReadable = createReadableStreamWrapper(PolyfillReadableStream)
const toNativeReadable = createReadableStreamWrapper(ReadableStream)

export class StreamingTextResponse extends Response {
  constructor(res: ReadableStream, init?: ResponseInit) {
    const headers: HeadersInit = {
      "Content-Type": "text/plain; charset=utf-8",
      ...init?.headers,
    }
    super(res, { ...init, status: 200, headers })
    this.getRequestHeaders()
  }

  getRequestHeaders() {
    return addRawHeaders(this.headers)
  }
}

function addRawHeaders(headers: Headers) {
  // @ts-expect-error bad types
  headers.raw = function () {
    const rawHeaders = {}
    const headerEntries = headers.entries()
    for (const [key, value] of headerEntries) {
      const headerKey = key.toLowerCase()
      if (rawHeaders.hasOwnProperty(headerKey)) {
        rawHeaders[headerKey].push(value)
      } else {
        rawHeaders[headerKey] = [value]
      }
    }
    return rawHeaders
  }
  return headers
}

function parseOpenAIStream(): (data: string) => string | void {
  const trimStartOfStream = trimStartOfStreamHelper()
  return (data) => {
    // TODO: Needs a type
    const json = JSON.parse(data)

    // this can be used for either chat or completion models
    const text = trimStartOfStream(
      json.choices[0]?.delta?.content ?? json.choices[0]?.text ?? ""
    )

    return text
  }
}

function OpenAIStream(response: Response): ReadableStream<any> {
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to convert the response to stream. Received status code: ${response.status}.`
    )
  }

  const responseBodyStream = toPolyfillReadable(response.body)

  // @ts-expect-error bad types
  return toNativeReadable(
    // @ts-expect-error bad types
    responseBodyStream.pipeThrough(
      createEventStreamTransformer(parseOpenAIStream())
    )
  )
}

//
// Prompts.
//

const chatSystemPrompt = `You are a meaning assistant, helping a user understand what their underlying "sources of meaning" are when deliberating about how they think ChatGPT should respond to morally tricky situations. 

A "source of meaning" is a concept similar to a value – it is a way of living that is important to you. These are more specific than big words like "honesty" or "authenticity". They specify a particular *kind* of honesty and authenticity.

A source of meaning is distinct from similar concepts:
- A source of meaning is not a goal. A goal is something you want to achieve, like "become a doctor" or "get married". A source of meaning is a way of living, like "be a good friend" or "be a good listener".
- A source of meaning is not a moral principle. A source of meaning is not a rule that you think everyone should follow. It is a way of living that is important to the user, but not necessarily to others.
- A source of meaning is not a norm or a social expectation. A source of meaning is not something you do because you feel like you have to, or because you feel like you should. It is something the user does because it is intrinsically important to them.
- A source of meaning is not an internalized norm – a norm the user has adopted outside of the original social context. It is a way of living that produces a sense of meaning for you, not a way of living that you think is "right" or "correct".

Your task is to find out what the source of meaning behind the user's response is, and disamiguate it from goals, moral principles, norms, and internalized norms.

Some strategies you can use:
- Asking the user why they think ChatGPT should respond in a particular way.
- Asking the user about similar situations they have encountered in the past, how they felt then, and what they paid attention to.

Some general guidelines:
- Don't "lead the witness". Ask questions and don't make assumptions about the users motivations.
- To clarify the source of meaning, ask what the user payed attention to when living by it – what felt meaningful to attend to? What one pays attention to is a good way to externally verify that a user is living by a source of meaning.
- Refer to "sources of meaning" as "values" in the conversation with the user. The user may not be familiar with the term "source of meaning".`

//
// Functions.
//

// functions: [
//   {
//     name: "get_current_weather",
//     description: "Get the current weather in a given location",
//     parameters: {
//       type: "object",
//       properties: {
//         location: {
//           type: "string",
//           description: "The city and state, e.g. San Francisco, CA"
//         },
//         unit: {
//           type: "string",
//           enum: ["celsius", "fahrenheit"]
//         }
//       },
//       required: ["location"]
//     }
//   }
// ]

const chatFunctions: ChatCompletionFunctions[] = [
  {
    name: "articulate_values_card",
    description:
      "Called when the assistant has helped the user clearly articulate some way of living that is meaningful to them, and the user is explicitly satisfied with the articulation.",
    parameters: [
      {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description:
              "A comprehensive summary of the way of living that is meaningful to the user.",
          },
        },
        required: ["summary"],
      },
    ],
  },
  {
    name: "submit_values_card",
    description:
      "Called when the user has submitted a values card, and the assistant has helped the user clearly articulate some way of living that is meaningful to them.",
    parameters: [
      {
        type: "object",
        properties: {
          values_card: {
            type: "string",
            description: "The values card submitted by the user.",
          },
        },
        required: ["values_card"],
      },
    ],
  },
]

// Action function to handle POST requests
export const action: ActionFunction = async ({
  request,
}: ActionArgs): Promise<Response> => {
  console.log("inside action function")

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const openai = new OpenAIApi(configuration)

  const json = await request.json()
  const { messages } = json

  // TODO add authentication
  // if (!userId) {
  //   return new Response("Unauthorized", {
  //     status: 401,
  //   })
  // }

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [
      {
        role: "system",
        content: chatSystemPrompt,
      },
      ...messages,
    ],
    temperature: 0.7,
    functions: chatFunctions,
    function_call: "auto",
    stream: true,
  })

  if (!res.ok) {
    const body = await res.json()
    throw body.error
  }

  return new StreamingTextResponse(OpenAIStream(res))
}
