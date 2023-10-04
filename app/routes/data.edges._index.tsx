import Graph from "./data.edges.$caseId.js"
import { loader as edgesLoader } from "./data.edges[.]json.js"

export async function loader() {
  return await edgesLoader()
}

export default function DefaultGraphPage() {
  return <Graph />
}
