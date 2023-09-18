import { serve } from "inngest/remix"
import { deduplicate } from "~/services/deduplication"
import { embed } from "~/services/embedding"
import { inngest } from "~/config.server"
import { hypothesize } from "~/services/linking"
import { evaluateDialogues } from "~/services/dialogue-evaluator"

const handler = serve(inngest, [
  deduplicate,
  embed,
  hypothesize,
  evaluateDialogues,
])

export { handler as loader, handler as action }
