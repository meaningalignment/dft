import { serve } from "inngest/remix"
import { deduplicate } from "~/services/deduplication"
import { inngest } from "~/config.server"

const handler = serve(inngest, [deduplicate])

export { handler as loader, handler as action }
