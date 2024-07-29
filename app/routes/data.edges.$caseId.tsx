import { LoaderFunctionArgs, defer } from "@remix-run/node"
import { Suspense } from "react"
import { Await, useLoaderData } from "@remix-run/react"
import { MoralGraph } from "~/components/moral-graph"
import { summarizeGraph } from "~/values-tools/generate-moral-graph"

export async function loader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId!
  const graph = summarizeGraph({
    edgeWhere: {
      context: {
        ContextsOnCases: { some: { caseId } }
      }
    }
  })
  return defer({ graph })
}

export default function DefaultGraphPage() {
  const { graph } = useLoaderData<typeof loader>();
  return <Suspense fallback={<p>Please wait...</p>}>
    <Await resolve={graph}>{({ values, edges }) => <MoralGraph nodes={values} edges={edges} />}</Await>
  </Suspense>
}
