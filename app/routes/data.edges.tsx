import { Await, useLoaderData } from "@remix-run/react";
import { Suspense } from "react";
import { defer } from "@remix-run/node";
import { MoralGraph } from "~/components/moral-graph";
import { summarizeGraph } from "~/values-tools/generate-moral-graph";

export async function loader() {
  const graph = summarizeGraph()
  return defer({ graph })
}

export default function DefaultGraphPage() {
  const { graph } = useLoaderData<typeof loader>();
  return <Suspense fallback={<p>Please wait...</p>}>
    <Await resolve={graph}>{({ values, edges }) => <MoralGraph nodes={values} edges={edges} />}</Await>
  </Suspense>
}
