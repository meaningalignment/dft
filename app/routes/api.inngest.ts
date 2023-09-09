import { serve } from "inngest/remix"
import { deduplicate, deduplicateCase } from "~/services/deduplication"
import { embed } from "~/services/embedding"
import { inngest } from "~/config.server"
import { hypothesize, hypothesizeCase } from "~/services/linking"
import { evaluateDialogues } from "~/services/dialogue-evaluator"

const handler = serve(inngest, [
  deduplicate,
  deduplicateCase,
  embed,
  hypothesize,
  hypothesizeCase,
  evaluateDialogues,
])

export { handler as loader, handler as action }
