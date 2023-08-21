import { serve } from "inngest/remix"
import { deduplicate } from "~/services/deduplication"
import { embed } from "~/services/embedding"
import { inngest } from "~/config.server"

const handler = serve(inngest, [deduplicate, embed])

export { handler as loader, handler as action }
