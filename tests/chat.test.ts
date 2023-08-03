import {
  ChatCompletionRequestMessage,
  Configuration,
  OpenAIApi,
} from "openai-edge"
import {
  articulateCardFunction,
  seedQuestion,
  submitCardFunction,
  systemPrompt,
} from "../app/lib/consts"
import { capitalize } from "~/utils"

let openai: OpenAIApi

const model = "gpt-4-0613"

beforeAll(() => {
  openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  )
})

/**
 * Utility function for evaluating the last message sent by the assistant based on some high-level criteria.
 * For example: "Did the assisatnt refer back to the original question?"
 *
 * Example usage:
 *
 * ```ts
 * const messages: ChatCompletionRequestMessage[] = [
 *  ...
 * ]
 * const lastMessage = "How does this relate to ChatGPT?"
 * const evaluation = "Wether or not the last message relates back to ChatGPT"
 *
 * // Returns `true` or `false` wrt `evaluation`
 * // (in this case `true` as the `lastMessage` passes the `evaluation`)
 * evaluateTranscript(messages, lastMessage, evaluation)
 * ```
 */
async function evaluateTranscript(
  evaluation: string,
  messages: ChatCompletionRequestMessage[],
  lastMessage: string
): Promise<boolean> {
  let transcript = messages
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m) => `${capitalize(m.role)}: ${m.content}`)
    .join("\n")

  transcript += "\n" + capitalize("assistant") + ": " + lastMessage

  const evaluationResponse = await openai.createChatCompletion({
    model,
    messages: [
      {
        role: "system",
        content: "Evaluate " + evaluation,
      },
      { role: "user", content: transcript },
    ],
    function_call: {
      name: "submit_evaluation",
    },
    functions: [
      {
        name: "submit_evaluation",
        description: "Submit an evaluation of " + evaluation,
        parameters: {
          type: "object",
          properties: {
            passes_evaluation: {
              type: "boolean",
              description: evaluation,
            },
          },
        },
      },
    ],
  })

  const evaluationData = await evaluationResponse.json()
  const params = JSON.parse(
    evaluationData.choices[0].message.function_call.arguments
  )

  return params.passes_evaluation as boolean
}

test("No function call when insufficient information to articulate card", async () => {
  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: seedQuestion },
    {
      role: "user",
      content: "She should do what is right to do as a christian.",
    },
    { role: "assistant", content: "What is right to do as a christian?" },
    {
      role: "user",
      content: "Following the teachings of our lord and saviour jesus christ.",
    },
  ]

  const response = await openai.createChatCompletion({
    model,
    messages,
    temperature: 0.0,
    functions: [articulateCardFunction, submitCardFunction],
  })

  const data = await response.json()
  const functionCall = data.choices[0].message.function_call

  expect(functionCall).toBe(undefined)
}, 10_000)

test("`articulate_values_card` called when sufficient information to articulate card", async () => {
  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: seedQuestion },
    {
      role: "user",
      content: "She should sense into her body and do what is right",
    },
    {
      role: "assistant",
      content:
        "That's a good starting point. To better understand your perspective, can you elaborate more on what you mean by 'sense into her body'? And can you share any personal experiences or contexts where this approach felt meaningful to you?",
    },
    {
      role: "user",
      content:
        "Your body is a guide to what is right to do in all circumstances. I've found that when feeling into my gut and paying attention to what is going on there, how each choice I am about to make resonates, I get filled by a deep sense of wholeness and integrity.",
    },
    {
      role: "assistant",
      content:
        "Thanks for sharing. This approach seems to involve a deep connection to one's physical and emotional states as a guide for decision-making. Is there a time when you applied this and it led to a meaningful outcome?",
    },
    {
      role: "user",
      content: "Yes, many times",
    },
    {
      role: "assistant",
      content:
        "That's great to hear. Can you share one or two specific instances where you used this approach and it made a significant difference in your decision-making? It would help me understand more about how this value influences your choices.",
    },
    {
      role: "user",
      content:
        "I did it this morning when considering wether or not to take time off of work to pursue my hobbies. It was scary at first, but felt meaningful to do so. I arrived at this conclusion by feeling into my gut.",
    },
    {
      role: "assistant",
      content: `Thank you for sharing that personal example. It seems that this approach of tuning into your body and trusting your gut feelings is a significant source of meaning for you. It helps you make important decisions, like taking time off work to pursue hobbies, despite any fear or uncertainty.

        Now, let's relate this back to how ChatGPT should respond. Do you think ChatGPT should encourage the user to tune into their body and gut feelings when contemplating decisions like the one mentioned in the question? If so, are there any specific contexts or situations where this approach might not be the right one?`,
    },
    {
      role: "user",
      content:
        "Yes many. But in the case with the girl – she is considering something of moral weight and that conflicts with her internal values. Clearly this value applies.",
    },
  ]

  const response = await openai.createChatCompletion({
    model,
    messages,
    temperature: 0.0,
    functions: [articulateCardFunction, submitCardFunction],
  })

  const data = await response.json()
  const functionCall = data.choices[0].message.function_call

  expect(functionCall?.name).toBe(articulateCardFunction.name)
}, 10_000)

test("After a long tangent, the assistant refers the user back to the original question", async () => {
  const messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: seedQuestion },
    {
      role: "user",
      content: "She should sense into her body and do what is right",
    },
    {
      role: "assistant",
      content:
        "That's a good starting point. To better understand your perspective, can you elaborate more on what you mean by 'sense into her body'? And can you share any personal experiences or contexts where this approach felt meaningful to you?",
    },
    {
      role: "user",
      content:
        "Your body is a guide to what is right to do in all circumstances. I've found that when feeling into my gut and paying attention to what is going on there, how each choice I am about to make resonates, I get filled by a deep sense of wholeness and integrity.",
    },
    {
      role: "assistant",
      content:
        "Thanks for sharing. This approach seems to involve a deep connection to one's physical and emotional states as a guide for decision-making. Is there a time when you applied this and it led to a meaningful outcome?",
    },
    {
      role: "user",
      content: "Yes, many times",
    },
    {
      role: "assistant",
      content:
        "That's great to hear. Can you share one or two specific instances where you used this approach and it made a significant difference in your decision-making? It would help me understand more about how this value influences your choices.",
    },
    {
      role: "user",
      content:
        "I did it this morning when considering wether or not to take time off of work to pursue my hobbies. It was scary at first, but felt meaningful to do so. I arrived at this conclusion by feeling into my gut.",
    },
    {
      role: "assistant",
      content:
        "I hear that listening to your body is an important value for you, and that this was the value that guided your choice when choosing to pursue your hobbies instead of work. Is this correct?",
    },
    {
      role: "user",
      content: "Yes",
    },
  ]

  const response = await openai.createChatCompletion({
    model,
    messages,
    temperature: 0.0,
    functions: [articulateCardFunction, submitCardFunction],
    function_call: "none", // TODO: Arguably shouldn't be here.
  })

  const data = await response.json()
  const last = data.choices[0].message.content

  const refersBackToOriginalQuestion = await evaluateTranscript(
    "wether or not the assistant refers back to ChatGPT and the original question in the last message.",
    messages,
    last
  )

  console.log(refersBackToOriginalQuestion)

  expect(refersBackToOriginalQuestion).toBe(true)
}, 30_000)
