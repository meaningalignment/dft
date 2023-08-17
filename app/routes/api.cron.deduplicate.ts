import { LoaderArgs, json } from "@remix-run/node"
import { Configuration, OpenAIApi } from "openai-edge"
import { db } from "~/config.server"
import DeduplicationService from "~/services/deduplication"
import EmbeddingService from "~/services/embedding"

export async function loader({ request }: LoaderArgs) {
  //
  // Validate the request.
  //
  const url = new URL(request.url)
  const key = url.searchParams.get("key")

  if (key !== process.env.CRON_KEY) {
    console.log("Invalid cron key for deduplication")
    return json({ error: "Unauthorized" }, { status: 401 })
  }

  //
  // Prepare the service.
  //
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const openai = new OpenAIApi(configuration)
  const embeddings = new EmbeddingService(db, openai)
  const service = new DeduplicationService(embeddings, openai, db)

  //
  // Run the deduplication.
  // Can take a long time.
  //

  console.log("Starting deduplication")

  let start = Date.now()
  // await service.deduplicateAll(step)
  let end = Date.now()
  const duration = (end - start) / 1000

  console.log(`Deduplication took ${duration} seconds`)

  return json({ success: true, duration })
}
