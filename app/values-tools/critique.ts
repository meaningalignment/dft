import { attentionPoliciesCriteria, definitionOfASourceOfMeaning } from "./prompt-segments"
import { gpt4 } from "./gpt"
import { json } from "@remix-run/node"
import { db, isChatGpt } from "~/config.server"
import { embeddingService } from "./embedding"
import { CanonicalValuesCard } from "@prisma/client"
import { dftStyle, personalStyle } from "./value-styles"

const valueStyle = isChatGpt ? dftStyle : personalStyle

async function regenerateInstructionsDetailed(evaluationCriteria: string[]) {
  return await gpt4(regenPrompt, evaluationCriteria.join("\n"))
}

async function critiqueValuesCard(evaluationCriteria: string[]) {
  return await gpt4(critiquePrompt, evaluationCriteria.join("\n"))
}

async function generateTitles(evaluationCriteria: string[]) {
  return await gpt4(titlesPrompt, evaluationCriteria.join("\n"))
}


export async function updateCardFromForm(formData: FormData) {
  const cardId = Number(formData.get("cardId"))
  const cardType = formData.get("cardType") as string
  const title = formData.get("title") as string
  const instructionsShort = formData.get("instructionsShort") as string
  const instructionsDetailed = formData.get("instructionsDetailed") as string
  const evaluationCriteria = JSON.parse(formData.get("evaluationCriteria") as string || "[]")
  const data = { title, instructionsShort, instructionsDetailed, evaluationCriteria }
  if (cardType === "canonical") {
    await db.canonicalValuesCard.update({ where: { id: cardId }, data })
  } else if (cardType === "personal") {
    await db.valuesCard.update({ where: { id: cardId }, data })
  } else {
    throw new Error("Unknown card type")
  }
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
  } else if (task === 'generateTitles') {
    const result = await generateTitles(evaluationCriteria)
    return json(result)
  } else if (task === 'reembed') {
    const card = await db.canonicalValuesCard.findUnique({ where: { id: Number(formData.get("cardId")) } })
    await embeddingService.embedDeduplicatedCard(card as any)
    return json({ ok: true })
  } else {
    return json({ error: "Unknown task" }, { status: 400 })
  }
}

const titlesPrompt = `
I'll submit a list of attentional policies, meant to fit together to represent a "source of meaning".

Answer first: what kind of meaning might a person experience, when they attend to these things?

Then, suggest 10 potential titles for this source of meaning, like the examples below.

# Here are some examples of attentional policies and titles

1. Title: "Diverse Perspectives"

DIVERSITY of perspectives that exist within the population
INSIGHTS from different individuals who have thought about similar questions
ANGLES that the person may not have considered
CLARITY that emerges from understanding diverse viewpoints

2. Title: "Golden Retriever"

WHATEVER I'm excited about this week
MOMENTS of full commitment and enthusiasm towards new experiences
INSTANCES where I let go of hesitation, and fully engage in an activity or pursuit
ACTIONS I take in the fearless pursuit of my interests
ACHIEVEMENTS and BREAKTHROUGHS on the way to my dreams
EXPERIENCES of joy that start from within and bubble outward

3. Title: "Rapid Discernment"

AWARENESS of my gut feelings and instincts, such that I can trust them
MOMENTS where someone tries to impose their perspective or interpretation of events, and I keep them in their place
COMFORT in taking immediate and decisive action, guided by intuition, without doubt or hesitation
CONFIDENCE in my own judgment and decision-making abilities
MOMENTS of calm and clarity when intuition speaks louder than external noise
APPRECIATION for the inherent wisdom of my body and intuition
INSTANCES of successfully navigating complex situations by relying on intuition

4. Title: "Mama Bear"

ACTIONS to take that will get people dancing, open them up, etc
UNIQUE MOMENTS of social cohesion and expression
THOUGHTS and IDEAS that can be shared, to grow a relationship and learn from each other
GENUINE ENTHUSIASM when greeting people, to discover their depths
CURIOSITIES about the people around me
POSSIBILITIES for little walks or adventures with someone I'm curious about

# Definition of a source of meaning

${definitionOfASourceOfMeaning}
`

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
* Then, use the criteria below to mention any problems with the list. Be as sensitive as you can.
* Finally, suggest a list with all problems fixed. Do not remove any items from the list, but you can split one item into two, or change the wording of an item, or add new items.

# Definition of a source of meaning

${definitionOfASourceOfMeaning}

# Criteria for attention policies

${attentionPoliciesCriteria}

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
