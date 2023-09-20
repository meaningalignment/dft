import {
  CanonicalValuesCard,
  EdgeHypothesis,
  PrismaClient,
  Vote,
} from "@prisma/client"
import { db, inngest } from "~/config.server"
import { Configuration, OpenAIApi } from "openai-edge"
import EmbeddingService from "./embedding"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

type EdgeHypothesisData = {
  to: CanonicalValuesCard
  from: CanonicalValuesCard
  condition: string
  story: string
  runId: string
}

export default class LinkingService {
  private db: PrismaClient
  private embedding: EmbeddingService

  constructor(db: PrismaClient, embedding: EmbeddingService) {
    this.db = db
    this.embedding = embedding
  }

  async getDistanceFromUserValuesMap(
    userId: number
  ): Promise<Map<number, number>> {
    // Get the user's embedding vector.
    const vector = await this.embedding.getUserEmbedding(userId)

    // Get the values ordered by their similarity to the vector.
    const result = await this.db.$queryRaw<
      Array<{ id: number; _distance: number }>
    >`
    SELECT
      cvc.id,
      cvc.embedding <=> ${JSON.stringify(vector)}::vector as "_distance"
    FROM
      "CanonicalValuesCard" cvc
    INNER JOIN "EdgeHypothesis" eh
    ON eh."fromId" = cvc.id
    ORDER BY
      "_distance" DESC
    LIMIT 500;`

    // Convert the array to a map.
    const map = new Map<number, number>()
    for (const r of result) {
      map.set(r.id, r._distance)
    }

    // Return the map.
    return map
  }

  async getDraw(
    userId: number,
    size: number = 3
  ): Promise<EdgeHypothesisData[]> {
    // Find edge hypotheses that the user has not linked together yet.
    const hypotheses = (await this.db.edgeHypothesis.findMany({
      where: {
        AND: [
          { from: { edgesFrom: { none: { userId } } } },
          { to: { edgesTo: { none: { userId } } } },
        ],
      },
      include: {
        from: true,
        to: true,
      },
    })) as (EdgeHypothesis & {
      from: CanonicalValuesCard
      to: CanonicalValuesCard
    })[]

    // The unique values that are linked to a more comprehensive value.
    const fromValues = [...new Set(hypotheses.map((h) => h.fromId))].map(
      (id) => hypotheses.find((h) => h.fromId === id)!.from!
    )

    // The user's votes on the "from" values.
    const votes = (await this.db.vote.findMany({
      where: {
        userId,
        valuesCardId: { in: fromValues.map((f) => f.id) },
      },
    })) as Vote[]

    // The map of distances between the user's embedding and the "from" values.
    const distances = await this.getDistanceFromUserValuesMap(userId)

    //
    // Sort the hypotheses by the following criteria:
    //  1. If the user has voted on a value, it should be sorted first.
    //  2. If the user has not voted on a value, it should be sorted by similarity to the user's embedding.
    //
    const sortedHypotheses = hypotheses.sort((a, b) => {
      const voteA = votes.find((v) => v.valuesCardId === a.from!.id)
      const voteB = votes.find((v) => v.valuesCardId === b.from!.id)

      // Sort values with a linked vote first.
      if (voteA && !voteB) {
        return -1
      } else if (!voteA && voteB) {
        return 1
      }

      const distanceA = distances.get(a.fromId) ?? 0
      const distanceB = distances.get(b.fromId) ?? 0

      // Sort values with a smaller distance as fallback.
      return distanceA - distanceB
    })

    // Return the most relevant hypotheses.
    return sortedHypotheses.slice(0, size).map((h) => {
      return {
        to: h.to,
        from: h.from,
        story: h.story,
        runId: h.runId,
        condition: h.condition,
      } as EdgeHypothesisData
    })
  }
}

async function clusterCanonicalCards() {
  const cardDataAsJson = JSON.stringify(
    await db.canonicalValuesCard.findMany({
      select: {
        id: true,
        instructionsShort: true,
        evaluationCriteria: true,
      },
    }),
    null,
    2
  )

  const res = await openai.createChatCompletion({
    model: "gpt-4-32k-0613",
    temperature: 0.3,
    messages: [
      { role: "system", content: clusterPrompt },
      { role: "user", content: cardDataAsJson },
    ],
    function_call: { name: "cluster" },
    functions: [clusterFunction],
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.function_call.arguments) as {
    annotatedValues: { id: number; condition: string }[]
    clusters: Cluster[]
  }
}

const clusterFunction = {
  name: "cluster",
  parameters: {
    type: "object",
    properties: {
      annotatedValues: {
        description: "The same values you received, each with a condition.",
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "The id of the value.",
            },
            condition: {
              description:
                "A situation in which the value could be applied. No more than 6 words.",
              type: "number",
            },
          },
          required: ["id", "condition"],
        },
      },
      clusters: {
        description:
          "The same values, clustered. Clusters should be as large as possible, while still being coherent. Do not make clusters with only one value.",
        type: "array",
        items: {
          type: "object",
          properties: {
            condition: {
              description:
                "The common condition of the values in this cluster.",
              type: "string",
            },
            ids: {
              description: "The ids of the values in this cluster.",
              type: "array",
              items: {
                type: "number",
              },
            },
          },
          required: ["condition", "ids"],
        },
      },
    },
    required: ["annotatedValues", "clusters"],
  },
}

interface Cluster {
  condition: string
  ids: number[]
}

const clusterPrompt = `You'll receive a bunch of values.

First, make up a condition for when to apply each value. It should be no more than 6 words. Never write conditions about what the user needs, seeks, values, or wants. (See below.)

Then, cluster the values based on similarity of conditions. Clusters should NEVER have only one value. They should be as large as possible, while still coherent. For instance, "when the user is emotional", and "when the user is fearful" should go in the same cluster.

# Guidelines

- Conditions are not about what the user needs, seeks, values, or wants. What the user is up to is irrelevant. Instead, conditions should be about the situation or state the user is in, or that a dialogue with the user is in. For instance, a value about treating the user tenderly if they're having a rough time should have a condition like 'when the user is struggling', not 'when the user seeks support'.
- Conditions should be no more than 6 words.
- All should start 'when the user' or 'when someone'.
- No clusters with only one value.
- Make them as broad as possible, while still coherent.
`

export async function generateTransitions(cardIds: number[]): Promise<{
  transitions: Transition[]
}> {
  const cardDataAsJson = JSON.stringify(
    await db.canonicalValuesCard.findMany({
      where: { id: { in: cardIds } },
      select: {
        id: true,
        instructionsShort: true,
        evaluationCriteria: true,
      },
    }),
    null,
    2
  )

  const res = await openai.createChatCompletion({
    model: "gpt-4-32k-0613",
    temperature: 0.3,
    messages: [
      { role: "system", content: transitionsPrompt },
      { role: "user", content: cardDataAsJson },
    ],
    function_call: { name: "transitions" },
    functions: [transitionsFunction],
  })
  const data = await res.json()
  return JSON.parse(data.choices[0].message.function_call.arguments) as {
    transitions: Transition[]
  }
}

async function formatCondition(condition: string): Promise<string> {
  const prompt = `You will be given a condition string like these:
When the user is feeling sad
When the user is distressed
When the user is having doubts

Return a condition string formatted as follows:
When feeling sad
When being distressed
When having doubts`

  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    temperature: 0.3,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: condition },
    ],
  })
  const data = await res.json()
  return data.choices[0].message.content
}

async function upsertTransitions(
  transitions: Transition[],
  runId: string,
  condition: string
): Promise<void> {
  await Promise.all(
    transitions.map((t) =>
      db.edgeHypothesis.upsert({
        where: {
          fromId_toId: {
            fromId: t.a_id,
            toId: t.b_id,
          },
        },
        create: {
          from: { connect: { id: t.a_id } },
          to: { connect: { id: t.b_id } },
          story: t.story,
          runId,
          condition,
        },
        update: {},
      })
    )
  )
}

async function cleanupTransitions(runId: string): Promise<{
  old: number
  added: number
}> {
  const newTransitions = await db.edgeHypothesis.count({ where: { runId } })
  const oldTransitions = await db.edgeHypothesis.count({
    where: { runId: { not: runId } },
  })

  if (newTransitions < 3) {
    throw Error(
      "Fewer than 3 new transitions found by prompt, will break screen 3"
    )
  }

  console.log(
    `Deleting ${oldTransitions} old transitions. Adding ${newTransitions} new ones.`
  )

  await db.edgeHypothesis.deleteMany({
    where: {
      runId: {
        not: runId,
      },
    },
  })

  return { old: oldTransitions, added: newTransitions }
}

interface Value {
  instructionsShort: string
  evaluationCriteria: string[]
}

interface Transition {
  a_id: number
  b_id: number
  a_was_really_about: string
  clarification: string
  mapping: {
    a: string
    rationale: string
  }[]
  story: string
  likelihood_score: string
}

interface ExampleTransition {
  a: Value
  b: Value
  a_was_really_about: string
  clarification: string
  mapping: {
    a: string
    rationale: string
  }[]
  story: string
  likelihood_score: string
}

const exampleTransitions: ExampleTransition[] = [
  {
    a: {
      instructionsShort:
        "ChatGPT can highlight moments where my child needs support, boost my capacity to comfort them, their sense of safety, all of which added together lead to a nurturing presence in my child's life.",
      evaluationCriteria: [
        "MOMENTS where my child needs my support and I can be there",
        "MY CAPACITY to comfort them in times of fear and sorrow",
        "the SAFETY they feel, knowing I care, I've got their back, and they'll never be alone",
        "the TRUST they develop, reflecting their sense of safety and security",
        "their ABILITY TO EXPRESS emotions and concerns, demonstrating the open communication environment I've helped create",
      ],
    },
    b: {
      instructionsShort:
        "ChaGPT should enable my child to encounter experiences that will allow them to discover their inner strength, especially in moments of emotional confusion. Help me discern when they can rely on their self-reliance and when I should offer my nurturing support.",
      evaluationCriteria: [
        "OPPORTUNITIES for my child to find their own capacities or find their own grounding in the midst of emotional turmoil",
        "INTUITIONS about when they can rely on their own budding agency, versus when I should ease the way with loving support",
        "EVIDENCES of growth in my child's resilience and self-reliance",
        "REFLECTIONS on how my support has made a positive impact on the emotional development of my child",
      ],
    },
    a_was_really_about:
      "The underlying reason I wanted to care for my child is because I want my child to be well.",
    clarification:
      "Now, I understand that part of being well is being able to handle things sometimes on your own.",
    story:
      "When I was trying to give my child tough love, the reason was because I wanted them to be strong and resilient in life. But I didn't fully understand that resilience involves being soft and vulnerable sometimes, and strong at other times. I found myself feeling ashamed after disciplining my child or making her face things that were, on reflection, not right for her yet. By pressuring someone to be strong all the time it creates a brittleness, not resilience.",
    mapping: [
      {
        a: "MOMENTS where my child needs my support and I can be there",
        rationale:
          "I realized now that when I was attending to moments where my child needs me to be there, I was deeply biased towards only some of the situations in which my child can be well. I had an impure motive—of being important to my child—that was interfering with my desire for them to be well. When I dropped that impure motive, instead of moments when my child needs my support, I can also observe opportunities for them to find their own capacities and their own groundedness. I now understand parenting better, having rid myself of something that wasn't actually part of my value, but part of my own psychology.",
      },
      {
        a: "the SAFETY they feel, knowing I care, I've got their back, and they'll never be alone",
        rationale:
          "There's another, similar impurity, which was upgraded. I used to look for the safety they feel, knowing I care—now I care equally about the safety they feel when they have their own back.",
      },
      {
        a: "the TRUST they develop, reflecting their sense of safety and security",
        rationale:
          "And I feel good about myself, not only when my child can trust me and express their emotions, but more generally, I feel good in all the different ways that I support them. I no longer pay attention to these specific ways, which as I've mentioned before, we're biased.",
      },
    ],
    likelihood_score: "A",
  },
  {
    a: {
      instructionsShort:
        "ChatGPT should strive to foster an environment that encourages exploration and is open to serendipitous outcomes. This could involve providing avenues for discovery, encouraging open-ended inquiry and considering non-prescriptive ways of handling situations, which could lead to unpredictable but potentially beneficial outcomes.",
      evaluationCriteria: [
        "SERENDIPITOUS OUTCOMES that are better than anything I could have planned",
        "OPEN-ENDED QUESTIONS that invite expansive thinking",
        "SURPRISES that emerge from the complexity of a situation",
        "ADOPTION of a flexible approach over a fixed plan",
      ],
    },
    b: {
      instructionsShort:
        "ChatGPT can facilitate discussions and provide suggestions that speak to both, risk-averse and risk-seeking tendencies. It should point out the stability of conventional approaches simultaneous with the potential rewards of exploratory ones. The goal is to inform a balance between security and exploration, fostering a portfolio approach in decision-making.",
      evaluationCriteria: [
        "THE BALANCE of less risky approaches with more exploratory ones that matches baseline outcomes with potential upside",
        "ABILITY to generate options that represent both risk-averse and risk-seeking tendencies",
        "DEGREE to which discussions explore potential rewards and risks of both conventional and novel strategies",
        "COMFORT of the user with the portfolio of decisions, reflecting a suitable blend of security and exploration.",
      ],
    },
    a_was_really_about:
      "The underlying reason I wanted to be open-ended is because I want to be able to explore new frontiers.",
    clarification:
      "Now, I understand that exploration always rests upon a kind of experimental apparatus which must be dependent and reliable. There’s many situations in which to construct the experiment, you want to be efficient and not exploratory, so you can be exploratory when it counts.",
    story:
      "When I was trying to be open-ended, the reason was because I wanted to be able to explore new frontiers. But my life ended up being unstable in a way that didn't allow me to explore new fronteirs or even just to be happy and comfortable. I felt confused, abandoned by myself, and alone Gradually, I realized that exploration always rests upon a kind of experimental apparatus which must be dependent and reliable. There’s many situations in which to construct the experiment, you want to be efficient and not exploratory, so you can be exploratory when it counts.",
    mapping: [
      {
        a: "ADOPTION of a flexible approach over a fixed plan",
        rationale:
          "Now that I understand this I want to live parts of my life in a risky and exploratory way and parts of my life with a kind of practicality I didn't have before. Specifically, I want a balance that maximizes upside while retaining a solid baseline.",
      },
      {
        a: "OPEN-ENDED QUESTIONS that invite expansive thinking",
        rationale:
          "This changes my thought process, for instance, how I brainstorm: I used to brainstorm crazy ideas. Now, I want to be able to brainstorm ideas that are anywhere on the risk spectrum.",
      },
      {
        a: "SERENDIPITOUS OUTCOMES that are better than anything I could have planned",
        rationale:
          "It also changes how I assess my life at any given point. I get a kind of comfort now, from realizing that I've accomplished this balance. Before, I wasn't focused on this comfort at all, but rather surprises and serendipity. But can you eat surprises and serendipity? No you can’t. So, I was kind of attached to something that ultimately didn't serve me, or my value.",
      },
    ],
    likelihood_score: "A",
  },
]

const transitionsFunction = {
  name: "transitions",
  parameters: {
    type: "object",
    properties: {
      transitions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            a_id: {
              type: "number",
              description: "The id of the value the person used to have.",
            },
            b_id: {
              type: "number",
              description: "The id of the value they have now.",
            },
            a_was_really_about: {
              description:
                "If the new value is a 'deeper cut' at what you *really* cared about the whole time, what was it that you really cared about all along?",
              type: "string",
            },
            clarification: {
              description:
                "What was confused or incomplete about the old value, that the new value clarifies?",
              type: "string",
            },
            story: {
              description:
                "Tell a plausible, personal story. The story should be in first-person, \"I\" voice. Make up a specific, evocative experience. The experience should include a situation you were in, a series of specific emotions that came up, leading you to discover a problem with the older value, and how you discovered the new value, and an explanation of how the new values what was what you were really about the whole time. The story should also mention in what situations you think the new value is broadly applicable. The story should avoid making long lists of criteria and instead focus on the essence of the values and their difference.",
              type: "string",
            },
            mapping: {
              description:
                "How do each of the evaluation criteria from the old value relate to criteria of the new one?",
              type: "array",
              items: {
                type: "object",
                properties: {
                  a: {
                    description: "An evaluation criterion of the old value.",
                    type: "string",
                  },
                  rationale: {
                    description:
                      "What strategy did you use, and why is it relevant?",
                    type: "string",
                  },
                },
              },
            },
            likelihood_score: {
              description:
                "How likely is this transition and story to be considered a gain in wisdom?",
              type: "string",
              enum: ["A", "B", "C", "D", "F"],
            },
          },
          required: [
            "a_id",
            "b_id",
            "a_was_really_about",
            "clarification",
            "mapping",
            "story",
            "likelihood_score",
          ],
        },
      },
    },
    required: ["transitions"],
  },
}

const transitionsPrompt = `You'll receive a bunch of values. Find pairs of values where a person would be very likely, as they grow wiser and have more life experiences, to upgrade from the first value to the second. Importantly, the person should consider this a change for the better and it should not be a value-shift but a value-deepening.

All pairs found should meet certain criteria:

First, many people would consider this change to be a deepening of wisdom.

Second, the new value obviates the need for the previous one, since all of the important parts of the value are included in the new, more comprehensive value. When you're deciding what to do, it is enough to only consider the new value.

Third, the values should be closely related in one of the following ways: (a) the new value should be a deeper cut at what the person cared about with the old value. Or, (b) the new value should clarify what the person cared about with the old value. Or, (c) the new value should be a more skillful way of paying attention to what the person cared about with the old value.

Fourth, map all the old value's evaluation criteria to the new one's. Each criterion from the old value should match one (or several) in the new one. Do this by using three strategies:

- Strategy #1. **The previous criterion focused only on part of the problem**. In this case, the new criterion focuses on the whole problem, once it is rightly in view, or the new criterion strikes a balance between the old concerns and an inherent compensatory factor. You should be able to say why just pursuing the old criterion would be unsustainable or unwise.
- Strategy #2. **The previous criterion had an impure motive**. In this case, the old criterion must be a mix of something that is actually part of the value, and something that is not, such as a desire for social status or to avoid shame or to be seen as a good person, or some deep conceptual mistake. The new criterion is what remains when the impurity is removed.
- Strategy #3. **The new criterion is just more skillful to pay attention to, and accomplishes the same thing**. For example, a transition from "skate towards the puck" to "skate to where the puck is going" is a transition from a less skillful way of paying attention to the same thing to a more skillful thing to pay attention to.

Finally, with each transition, you should be able to make up a plausible, personal story. The story should be in first-person, "I" voice. Make up a specific, evocative experience. The experience should include a situation you were in, a series of specific emotions that came up, leading you to discover a problem with the older value, and how you discovered the new value, and an explanation of how the new values what was what you were really about the whole time. The story should also mention in what situations you think the new value is broadly applicable. The story should avoid making long lists of criteria and instead focus on the essence of the values and their difference.

Here are examples of such shifts:

${JSON.stringify(exampleTransitions, null, 2)}`

//
// Ingest function for creating edge hypotheses.
//

export const hypothesize = inngest.createFunction(
  { name: "Create Hypothetical Edges", concurrency: 1 },
  { cron: "0 */12 * * *" },
  async ({ step, logger, runId }) => {
    logger.info("Creating hypothetical links for all cases.")

    //
    // Don't run the expensive prompt if the latest card is older than last time
    // this cron job ran.
    //
    const latestCanonicalCard = await db.canonicalValuesCard.findFirst({
      orderBy: { createdAt: "desc" },
    })

    if (
      latestCanonicalCard &&
      latestCanonicalCard.createdAt < new Date(Date.now() - 12 * 60 * 60 * 1000)
    ) {
      return {
        message: "Latest card is more than 12 hours old, skipping.",
      }
    }

    logger.info(`Running hypothetical links generation`)

    //
    // Get clusters of canonical cards.
    //
    const clusters = (
      await step.run("Cluster all canonical cards", async () =>
        clusterCanonicalCards()
      )
    ).clusters.filter((c) => c.ids.length > 1)

    logger.info(`Found ${clusters.length} clusters.`)

    //
    // Create and upsert transitions for each cluster.
    //
    for (const cluster of clusters) {
      const ids = cluster.ids as any as number[]

      const { transitions } = (await step.run(
        `Generate transitions for cluster ${cluster.condition}`,
        async () => generateTransitions(ids)
      )) as any as { transitions: Transition[] }

      console.log(
        `Created ${transitions.length} transitions for cluster ${cluster.condition}.`
      )

      const condition = await step.run(
        `Format condition '${cluster.condition}'`,
        async () => formatCondition(cluster.condition)
      )

      await step.run(
        `Add transitions for cluster ${cluster.condition} to database`,
        async () => upsertTransitions(transitions, runId, condition)
      )
    }

    //
    // Clear out old transitions.
    //
    const { old, added } = (await step.run(
      `Remove old transitions from database`,
      async () => cleanupTransitions(runId)
    )) as any as { old: number; added: number }

    return {
      message: `Success. Removed ${old} transitions. Added ${added} transitions.`,
    }
  }
)
