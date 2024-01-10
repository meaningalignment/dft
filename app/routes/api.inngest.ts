import { serve } from "inngest/remix"
import { deduplicate as deduplicate_old } from "~/services/deduplication"
import { embed } from "~/values-tools/embedding"
import { inngest } from "~/config.server"
import { hypothesize } from "~/services/linking"
import { evaluateDialogues } from "~/values-tools/dialogue-evaluator"
import { deduplicate as deduplicate_new } from "~/values-tools/deduplicator2"

const handler = serve(inngest, [
  // disable these in prod for now while Joe manages the transition

  // deduplicate_old,
  // embed,

  hypothesize,
  evaluateDialogues,

  // this will run on Joe's machine only for now

  // deduplicate_new
])

export const config = {
  maxDuration: 300
};

export { handler as loader, handler as action }