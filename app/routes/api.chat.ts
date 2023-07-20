import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge"
import { ActionArgs, ActionFunction } from "@remix-run/node"

//
// The Vercel "ai" package is broken for Remix.
// Here is a temporary fix from https://github.com/vercel-labs/ai/issues/199.
// To remove, use the OpenAIStream function from the package instead.
//
// Everything before the action function in this file should be removed when fixed.
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
  // @ts-expect-error shame on me
  headers.raw = function () {
    const rawHeaders = {}
    const headerEntries = headers.entries()
    for (const [key, value] of headerEntries) {
      const headerKey = key.toLowerCase()
      if (rawHeaders.hasOwnProperty(headerKey)) {
        // @ts-expect-error shame on me
        rawHeaders[headerKey].push(value)
      } else {
        // @ts-expect-error shame on me
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
  const { messages, previewToken } = json

  // TODO add authentication
  // if (!userId) {
  //   return new Response("Unauthorized", {
  //     status: 401,
  //   })
  // }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant helping users understand the underlying value behind how they respond to a tricky moral situation.",
      },
      ...messages,
    ],
    temperature: 0.7,
    stream: true,
  })

  return new StreamingTextResponse(OpenAIStream(res))
}
