import { useSearchParams } from "@remix-run/react";
import Polis from "~/components/polis";

export default function CCAI() {
  const [searchParams] = useSearchParams()
  const prolificId = searchParams.get("PROLIFIC_ID")

  if (!prolificId) {
    return <div>Missing PROLIFIC_ID</div>
  }

  return <Polis
    polisId="5fhwbnabmh"
    finishedUrl={"https://docs.google.com/forms/d/e/1FAIpQLScuP3SsT60l08Qta3KN9f5M2WccqAWNtt62p-A-haCyUT_oig/viewform?usp=pp_url&entry.1333431336=" + prolificId}
  />
}