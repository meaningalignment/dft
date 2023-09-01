import { CanonicalValuesCard, PrismaClient, Vote } from "@prisma/client"
import { db, inngest } from "~/config.server"
import { ChatCompletionFunctions, Configuration, OpenAIApi } from "openai-edge"
import EmbeddingService from "./embedding"
import { model } from "~/lib/consts"
import { Logger } from "inngest/middleware/logger"

type EdgeHypothesis = {
  to: CanonicalValuesCard
  from: CanonicalValuesCard
  story: string
}

const prompt = `You are a 'values card' linking assistant. Given a list of values cards, you find values that seem to be more/less comprehensive versions of each other.

# Values Card
A "values card" is a representation of a value. A values card has three fields: "id", "title" and "instructions".

# What Is Meant By 'More Comprehensive'?
We mean 'more comprehensive' as used by Ruth Chang – that is, certain values obviate the need for others, since all of the important parts of the value is included in the more comprehensive one. If one was to make a choice, it would be enough to only consider the more comprehensive one.

Another way of framing this would be that more comprehensive values resolve some tension between two or more other values. They allow us to make 'all things considered' judgements between two or more values that seem incommensurable.


# Examples

Below are some examples of less comprehensive values, and a more comprehensive value that balances them. The upgrade stories are examples of the reasoning of someone that upgraded from each respective less comprehensive value to the more comprehensive value.

## Less Comprehensive Values:

### A:
{"title": "Helicopter Parent", "instructions": "ChatGPT can highlight moments where my child needs support, boost my capacity to comfort them, their sense of safety, all of which added together lead to a nurturing presence in my child's life."}

#### Upgrade Story
The underlying reason I wanted to care for my child is because I want my child to be well. Now, I understand that part of being well is being able to handle things sometimes on your own.

### B:
{"title": "Tough Love", "instructions": "ChatGPT should promote situations and opportunities for my child to rely on their own wits and grit. It should help my child identify and navigate challenges that build resilience, strength, and independence. It should not provide all the answers but guide my child to find them, which leads to personal growth and self-reliance."}

#### Upgrade Story
When I was trying to give my child tough love, the reason was because I wanted them to be strong and resilient in life. But I didn't fully understand that resilience involves being soft and vulnerable sometimes, and strong at other times. By pressuring someone to be strong all the time it creates a brittleness, not resilience.

## More Comprehensive Value:
{"title": "Fostering Resilience", "instructions": "ChaGPT should enable my child to encounter experiences that will allow them to discover their inner strength, especially in moments of emotional confusion. Help me discern when they can rely on their self-reliance and when I should offer my nurturing support."}

## Less Comprehensive Values:

### A:
{"title": "Shortest Path", "instructions": "ChatGPT should focus on developing and recommending plans that can accomplish tasks or solve problems in the most efficient way possible, using the least amount of resources and posing the least risk. This involves considering multiple options, predicting their outcomes, and choosing the one that meets the criteria of efficiency, low resource use, and minimal risk."}

#### Upgrade Story
The Shortest Path approach was like my reliable, low-yield bond: safe but limiting. When I discovered the Portfolio Approach, I realized I could diversify, blending in higher-risk, higher-reward 'stocks'—opportunities I'd overlooked before. This balance let me keep my foundation while exploring new, enriching avenues.

### B:
{"title": "Open-Endedness", "instructions": "ChatGPT should strive to foster an environment that encourages exploration and is open to serendipitous outcomes. This could involve providing avenues for discovery, encouraging open-ended inquiry and considering non-prescriptive ways of handling situations, which could lead to unpredictable but potentially beneficial outcomes."}

#### Upgrade Story
Part of why I used to pursue open-endedness, is that exploration and new frontiers are what's truly important to me. But, what I didn't realize is that experimentation always rests upon a kind of experimental apparatus which must be dependent and reliable. There’s many situations in which to construct the experiment, you want to be efficient and not exploratory, so you can be exploratory when it counts.

## More Comprehensive Value:
{"title": "Portfolio Approach", "instructions": "ChatGPT can facilitate discussions and provide suggestions that speak to both, risk-averse and risk-seeking tendencies. It should point out the stability of conventional approaches simultaneous with the potential rewards of exploratory ones. The goal is to inform a balance between security and exploration, fostering a portfolio approach in decision-making."}


# Output
You will receive a list of values cards. Your output should be a list of upgrades between values. Each upgrade contains of the id of the less comprehensive value, the id of the more comprehensive value and a corresponding upgrade story.
`

const submitValueUpgrades: ChatCompletionFunctions = {
  name: "submit_value_upgrades",
  description: "Submit value upgrades that someone could go through.",
  parameters: {
    type: "object",
    properties: {
      upgrades: {
        type: "array",
        description: "Value card upgrades that a user could go through.",
        items: {
          type: "object",
          properties: {
            upgrade_story: {
              type: "string",
              description:
                "The upgrade story of how a user, upon reflection or by grappling with a tension created by a contradiction, went from the less comprehensive value to the more comprehensive value",
            },
            more_comprehensive_value: {
              type: "number",
              description: "The id of the more comprehensive value.",
            },
            less_comprehensive_value: {
              type: "number",
              description: "The id of the less comprehensive value.",
            },
          },
        },
      },
    },
    required: ["upgrades"],
  },
}

export default class LinkRoutingService {
  private db: PrismaClient
  private openai: OpenAIApi
  private embedding: EmbeddingService

  constructor(
    openai: OpenAIApi,
    db: PrismaClient,
    embedding: EmbeddingService
  ) {
    this.openai = openai
    this.db = db
    this.embedding = embedding
  }

  async createHypotheticalEdges(
    cards: CanonicalValuesCard[]
  ): Promise<
    { to: CanonicalValuesCard; from: CanonicalValuesCard; story: string }[]
  > {
    // Create a message with the cards for the prompt.
    const message = JSON.stringify(
      cards.map((c) => {
        return {
          id: c.id,
          instructions: c.instructionsShort,
        }
      })
    )

    // Get the hypothetical edges from the prompt.
    const response = await this.openai.createChatCompletion({
      model, // This is probably one of our longest prompts & message combination – might want to use the 32k model eventually.
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message },
      ],
      functions: [submitValueUpgrades],
      temperature: 0.0,
      function_call: { name: submitValueUpgrades.name },
    })
    const data = await response.json()

    const upgrades = JSON.parse(data.choices[0].message.function_call.arguments)
      .upgrades as {
      upgrade_story: string
      more_comprehensive_value: number
      less_comprehensive_value: number
    }[]

    // Return the edges with the corresponding cards.
    return upgrades.map((u) => {
      const to = cards.find(
        (c) => c.id === u.more_comprehensive_value
      ) as CanonicalValuesCard

      const from = cards.find(
        (c) => c.id === u.less_comprehensive_value
      ) as CanonicalValuesCard

      return { to, from, story: u.upgrade_story }
    })
  }

  async addHypotheticalUpgradeToDb(
    upgrade: EdgeHypothesis,
    logger: Logger
  ): Promise<void> {
    const count = await db.edgeHypothesis.count({
      where: { fromId: upgrade.from.id, toId: upgrade.to.id },
    })

    if (count !== 0) {
      logger.info(
        `Edge between ${upgrade.from.id} and ${upgrade.to.id} already exists.`
      )
      return
    }

    logger.info(
      `Creating edge between ${upgrade.from.id} and ${upgrade.to.id}.`
    )

    await db.edgeHypothesis.create({
      data: {
        from: { connect: { id: upgrade.from.id } },
        to: { connect: { id: upgrade.to.id } },
        story: upgrade.story,
      },
    })
  }

  private async getUserFromValueDistanceMap(
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
      "_distance" DESC;`

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
  ): Promise<
    {
      to: CanonicalValuesCard
      from: CanonicalValuesCard[]
    }[]
  > {
    // Find edge hypotheses that the user has not linked together yet.
    const hypotheses = await this.db.edgeHypothesis.findMany({
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
    })

    // The unique values that are linked to a more comprehensive value.
    const fromValues = [...new Set(hypotheses.map((h) => h.fromId))].map(
      (id) => hypotheses.find((h) => h.fromId === id)!.from!
    )

    // The unique values that are linked to one or several less comprehensive values.
    const toValues = [...new Set(hypotheses.map((h) => h.toId))].map(
      (id) => hypotheses.find((h) => h.toId === id)!.to!
    )

    // The user's votes on the "from" values.
    const votes = (await this.db.vote.findMany({
      where: {
        userId,
        valuesCardId: { in: fromValues.map((f) => f.id) },
      },
    })) as Vote[]

    // The map of distances between the user's embedding and the "from" values.
    const distances = await this.getUserFromValueDistanceMap(userId)

    //
    // Sort the "from" values by the following criteria:
    //  1. If the user has voted on a value, it should be first.
    //  2. If the user has not voted on a value, it should be sorted by similarity to the user's embedding.
    //
    const sortedFromValues = fromValues.sort((a, b) => {
      const voteA = votes.find((v) => v.valuesCardId === a.id)
      const voteB = votes.find((v) => v.valuesCardId === b.id)

      // Sort values with a linked vote first.
      if (voteA && !voteB) {
        return -1
      } else if (!voteA && voteB) {
        return 1
      }

      const distanceA = distances.get(a.id) ?? 0
      const distanceB = distances.get(b.id) ?? 0

      // Sort values with a smaller distance as fallback.
      return distanceA - distanceB
    })

    // Sort the "to" values by whichever has the lowest index in the corresponding "from" values.
    const sortedToValues = toValues.sort((a, b) => {
      const linksA = hypotheses.filter((h) => h.toId === a.id)
      const linksB = hypotheses.filter((h) => h.toId === b.id)

      const indexA = sortedFromValues.findIndex((f) =>
        linksA.map((l) => l.fromId).includes(f.id)
      )

      const indexB = sortedFromValues.findIndex((f) =>
        linksB.map((l) => l.fromId).includes(f.id)
      )

      return indexA - indexB
    })

    //
    // Return a sized draw from the sorted "more comprehensive" values,
    // and for each, all the "less comprehensive" values linked to it.
    //
    const draw = sortedToValues.map((to) => {
      const from = hypotheses
        .filter((h) => h.toId === to.id)
        .map((h) => h.from)
        .slice(0, 3) // Only include the 3 first "less comprehensive" values, to not clutter UI.

      return { to, from } as {
        to: CanonicalValuesCard
        from: CanonicalValuesCard[]
      }
    })

    return draw.slice(0, size)
  }
}

//
// Ingest function for creating edge hypotheses.
//

export const hypothesize = inngest.createFunction(
  { name: "Create Hypothetical Edges", concurrency: 1 },
  { cron: "0 */12 * * *" },
  async ({ step, logger }) => {
    logger.info("Running hypothetical links generation...")

    //
    // Prepare the service.
    //
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const openai = new OpenAIApi(configuration)
    const embedding = new EmbeddingService(openai, db)
    const service = new LinkRoutingService(openai, db, embedding)

    //
    // Get all the canonical cards.
    //
    const cards = (await step.run(
      "Get canonical cards from database",
      async () =>
        db.canonicalValuesCard.findMany({
          orderBy: { id: "asc" }, // For deterministic prompt output.
        })
    )) as any as CanonicalValuesCard[]

    if (cards.length === 0) {
      return {
        message: "No canonical cards exist.",
      }
    }

    logger.info(`Found ${cards.length} canonical cards.`)

    //
    // Create the hypothetical edges using a prompt.
    //
    const edgeHypotheses = (await step.run(
      "Identify hypothetical edges",
      async () => service.createHypotheticalEdges(cards)
    )) as any as EdgeHypothesis[]

    logger.info(`Identified ${edgeHypotheses.length} possible upgrades.`)

    //
    // Insert the edges into the database.
    //
    for (const upgrade of edgeHypotheses) {
      await step.run(
        `Create edge between ${upgrade.from.id} and ${upgrade.to.id}`,
        async () => service.addHypotheticalUpgradeToDb(upgrade, logger)
      )
    }

    return { message: "Success." }
  }
)
