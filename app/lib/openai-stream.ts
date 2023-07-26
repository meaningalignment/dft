//
// The Vercel "ai" package is broken for Remix.
// Below is a temporary fix from https://github.com/vercel-labs/ai/issues/199.
//
// This file should be removed when the above issue is fixed.
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
        // @ts-expect-error bad types
        rawHeaders[headerKey].push(value)
      } else {
        // @ts-expect-error bad types
        rawHeaders[headerKey] = [value]
      }
    }
    return rawHeaders
  }
  return headers
}

function parseOpenAIStream(): (data: string) => string | void {
  const trimStartOfStream = trimStartOfStreamHelper()
  let isFunctionStreamingIn: boolean
  return (data) => {
    /*
       If the response is a function call, the first streaming chunk from OpenAI returns the name of the function like so

          {
            ...
            "choices": [{
              "index": 0,
              "delta": {
                "role": "assistant",
                "content": null,
                "function_call": {
                  "name": "get_current_weather",
                  "arguments": ""
                }
              },
              "finish_reason": null
            }]
          }

       Then, it begins streaming the arguments for the function call.
       The second chunk looks like:

          {
            ...
            "choices": [{
              "index": 0,
              "delta": {
                "function_call": {
                  "arguments": "{\n"
                }
              },
              "finish_reason": null
            }]
          }

        Third chunk:

          {
            ...
            "choices": [{
              "index": 0,
              "delta": {
                "function_call": {
                  "arguments": "\"location"
                }
              },
              "finish_reason": null
            }]
          }

        ...

        Finally, the last chunk has a `finish_reason` of either `function_call`:

          {
            ...
            "choices": [{
              "index": 0,
              "delta": {},
              "finish_reason": "function_call"
            }]
          }

        or `stop`, when the `function_call` request parameter 
        is specified with a particular function via `{\"name\": \"my_function\"}` 

          {
            ...
            "choices": [{
              "index": 0,
              "delta": {},
              "finish_reason": "stop"
            }]
          }

        With the implementation below, the client will end up getting a
        response like the one below streamed to them whenever a function call
        response is returned:

          {
            "function_call": {
              "name": "get_current_weather",
              "arguments": "{\"location\": \"San Francisco, CA\", \"format\": \"celsius\"}
            }
          }
     */
    const json = JSON.parse(data)
    if (json.choices[0]?.delta?.function_call?.name) {
      isFunctionStreamingIn = true
      return `{"function_call": {"name": "${json.choices[0]?.delta?.function_call.name}", "arguments": "`
    } else if (json.choices[0]?.delta?.function_call?.arguments) {
      const argumentChunk: string =
        json.choices[0].delta.function_call.arguments

      let escapedPartialJson = argumentChunk
        .replace(/\\/g, "\\\\") // Replace backslashes first to prevent double escaping
        .replace(/\//g, "\\/") // Escape slashes
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/\n/g, "\\n") // Escape new lines
        .replace(/\r/g, "\\r") // Escape carriage returns
        .replace(/\t/g, "\\t") // Escape tabs
        .replace(/\f/g, "\\f") // Escape form feeds

      return `${escapedPartialJson}`
    } else if (
      (json.choices[0]?.finish_reason === "function_call" ||
        json.choices[0]?.finish_reason === "stop") &&
      isFunctionStreamingIn
    ) {
      isFunctionStreamingIn = false // Reset the flag
      return '"}}'
    }

    const text = trimStartOfStream(
      json.choices[0]?.delta?.content ?? json.choices[0]?.text ?? ""
    )
    return text
  }
}

export function OpenAIStream(response: Response): ReadableStream<any> {
  if (!response.ok || !response.body) {
    const printBody = async () => {
      const body = await response.text()
    }
    printBody()
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
