import { serve } from "inngest/remix"
import { deduplicate as deduplicate_old } from "~/services/deduplication"
import { embed } from "~/values-tools/embedding"
import { inngest } from "~/config.server"
import { hypothesize, hypothesize_cron } from "~/services/linking"
import { evaluateDialogues } from "~/values-tools/dialogue-evaluator"
import { deduplicate as deduplicate_new, seedGeneration } from "~/values-tools/deduplicator2"
import { seed } from "~/services/seed"

const handler = serve(inngest, [
  seed,
  deduplicate_old,
  embed,

  hypothesize,
  hypothesize_cron,
  evaluateDialogues,

  // this is run at the start of a new dedupe generation
  // seedGeneration,

  deduplicate_new
])

export const config = {
  maxDuration: 300
};

export { handler as loader, handler as action }