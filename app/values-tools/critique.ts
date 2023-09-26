import { definitionOfASourceOfMeaning, valuesCardCriteria } from "./prompt-segments"
import { gpt4 } from "./gpt"
import { json } from "@remix-run/node"
import { db, valueStyle } from "~/config.server"

async function regenerateInstructionsDetailed(evaluationCriteria: string[]) {
  return await gpt4(regenPrompt, evaluationCriteria.join("\n"))
}

async function critiqueValuesCard(evaluationCriteria: string[]) {
  return await gpt4(critiquePrompt, evaluationCriteria.join("\n"))
}

export async function updateCardFromForm(formData: FormData) {
  const cardId = Number(formData.get("cardId"))
  const title = formData.get("title") as string
  const instructionsShort = formData.get("instructionsShort") as string
  const instructionsDetailed = formData.get("instructionsDetailed") as string
  const evaluationCriteria = JSON.parse(formData.get("evaluationCriteria") as string || "[]")
  await db.canonicalValuesCard.update({
    where: { id: cardId },
    data: {
      title,
      instructionsShort,
      instructionsDetailed,
      evaluationCriteria,
    }
  })
}

export async function runTaskFromForm(formData: FormData) {
  const task = formData.get("task") as string
  const evaluationCriteria = JSON.parse(formData.get("evaluationCriteria") as string || "[]")
  if (task === 'regenerateInstructionsDetailed') {
    const result = await regenerateInstructionsDetailed(evaluationCriteria)
    return json(result)
  } else if (task === 'critiqueEvaluationCriteria') {
    const result = await critiqueValuesCard(evaluationCriteria)
    return json(result)
  } else {
    return json({ error: "Unknown task" }, { status: 400 })
  }
}


const regenPrompt = `
I'll send a list of things that a person might attend to when following a value of theirs.

Please summarize these things by making a sentence. The sentence should look like "${valueStyle.instructionsLeadIn} Xs, Ys, Zs, that together Q".

Xs, Ys, and Zs should be plural forms of the noun phrases that start each item in the list I send. Shorten them if possible, omitting most qualifiers, but qualifying completely abstract words like "moments".

Q should be your best idea about what kind of meaning a person might experience when they attend to these things.

Return only the summary sentence.
`

const critiquePrompt = `I'll submit a list of attentional policies, meant to fit together to represent a "source of meaning".

Your response should have five parts:
* First, say whether they fit together to define a source of meaning.
* Take any items where you're unsure what they mean, and write a guess about what someone might mean is meaningful to attend to.
* List any additional things that a person who attends to these items would also probably find it meaningful to attend to, as part of the same source of meaning.
* Then, use the criteria below to mention any problems with the list.
* Finally, suggest a list with all problems fixed. Do not remove any items from the list, but you can split one item into two, or change the wording of an item, or add new items.

# Definition of a source of meaning

${definitionOfASourceOfMeaning}

# Criteria

${valuesCardCriteria}

# Example

Here is an example of a submitted list of attentional policies, and an improved version:

## Original

MOMENTS of clear decision-making that lead to deeper, more meaningful interaction
SHIFT from disorientation to delight as a sign of growth and deeper understanding
SENSE of groundedness and confidence in oneself, independent of external validation
DISCOVERY of unanticipated options and possibilities as a result of the clarity and perspective gained from grounded confidence
ABILITY to appraise the other person truthfully when grounded
CAPACITY to engage more freely and playfully with each other
FREEDOM and safety that comes from not needing constant reassurance from each other

## Improved

SENSE of groundedness and self-confidence, independent of external validation
MOMENTS of decision-making that open up new possibilities for interaction
SHIFTS from disorientation to delight because we are each willing to disorient the other
NEW WAYS OF INTERACTING that emerge from personal clarity and confidence
ABILITY to see the other person clearly and truthfully, without the need for reassurance
CAPACITY to engage more freely and playfully with each other
FEELINGS of freedom and safety that come from independence and self-assuredness
`
