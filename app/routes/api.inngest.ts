import { serve } from "inngest/remix"
import { deduplicate } from "~/services/deduplication"
import { embed } from "~/values-tools/embedding"
import { inngest } from "~/config.server"
import { hypothesize } from "~/services/linking"
import { evaluateDialogues } from "~/values-tools/dialogue-evaluator"

const handler = serve(inngest, [
  deduplicate,
  embed,
  hypothesize,
  evaluateDialogues,
])

export const config = {
  maxDuration: 300
};

export { handler as loader, handler as action }