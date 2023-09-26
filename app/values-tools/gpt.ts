import { openai } from "~/config.server"

export async function gpt4(systemPrompt: string, userMessage: string) {
  const result = await openai.createChatCompletion({
    model: "gpt-4-0613",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.4,
    stream: false,
  })
  const data = await result.json()
  return data.choices[0].message.content
}
