import { auth, db, openai } from "~/config.server"
import { ActionArgs, ActionFunction } from "@remix-run/node"
import { ValuesCardData } from "~/lib/consts"
import { OpenAIStream, StreamingTextResponse } from "~/lib/openai-stream"
import { ArticulatorService } from "~/services/articulator"
import DeduplicationService from "~/services/deduplication"
// import { OpenAIStream, StreamingTextResponse } from "ai"

const deduplication = new DeduplicationService(openai, db)

async function createHeaders(
  articulatedCard?: ValuesCardData | null,
  submittedCard?: ValuesCardData | null
): Promise<{ [key: string]: string }> {
  const headers: { [key: string]: string } = {}

  if (articulatedCard) {
    headers["X-Articulated-Card"] = JSON.stringify(articulatedCard)
  }

  if (submittedCard) {
    headers["X-Submitted-Card"] = JSON.stringify(submittedCard)
  }

  return headers
}

export const config = {
  maxDuration: 300,
}

export const action: ActionFunction = async ({
  request,
}: ActionArgs): Promise<Response> => {
  const articulatorConfig = process.env.ARTICULATOR_CONFIG ?? "default"
  const userId = await auth.getUserId(request)
  const json = await request.json()

  const { messages, chatId, caseId, function_call } = json

  // Create stream for next chat message.
  const articulator = new ArticulatorService(
    articulatorConfig,
    deduplication,
    openai,
    db
  )
  const { completionResponse, ...etc } =
    await articulator.processCompletionWithFunctions({
      userId,
      messages,
      function_call,
      chatId,
      caseId,
    })

  if (!completionResponse.ok) {
    const body = await completionResponse.json()
    throw body.error
  }

  if (etc.functionCall) {
    // If a function call is present in the stream, handle it...
    return new StreamingTextResponse(OpenAIStream(etc.response), {
      headers: await createHeaders(etc.articulatedCard, etc.submittedCard),
    })
  } else {
    // ...otherwise, return the response.
    return new StreamingTextResponse(OpenAIStream(completionResponse), {
      headers: await createHeaders(),
    })
  }
}
