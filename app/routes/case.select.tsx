import Header from "~/components/header"
import { useState } from "react"
import { Check } from "lucide-react"
import StaticChatMessage from "~/components/static-chat-message"
import { cn } from "~/utils"
import { Link, useLoaderData } from "@remix-run/react"
import ContinueButton from "~/components/continue-button"

import { json, redirect } from "@remix-run/node"
import { db } from "~/config.server"
import { Case } from "@prisma/client"
import { EmptyScreen } from "~/components/empty-screen"

export async function loader() {
  const cases = await db.case.findMany()

  if (cases.length === 0) {
    throw Error("No cases found. To add a new case, make sure you're an admin user and naviagte to /admin/cases.")
  }

  // Skip case select if there's only one case.
  if (cases.length === 1) {
    return redirect(`/case/${cases[0].id}/chat-explainer`)
  }

  return json({ cases })
}


function CaseCard({ caseData }: { caseData: Case }) {
  return (
    <div
      key={caseData.id}
      className={
        "border-2 border-border rounded-xl px-6 py-6 max-w-xs min-h-xs h-full bg-white flex flex-col gap-4"
      }
    >
      <p className="text-md font-bold">{caseData.title}</p>
      <p className="text-md text-neutral-500">{'"' + caseData.question + '"'}</p>
      <div className="flex-grow" />
    </div>
  )
}

function SelectedCaseCard({ caseData }: { caseData: Case }) {
  return (
    <div className="relative h-full w-full">
      <div className="w-full h-full border-4 border-black rounded-xl z-10 absolute pointer-events-none" />
      <div className="absolute -bottom-2 -right-2 z-20">
        <div className="bg-black h-6 w-6 rounded-full flex flex-col justify-center items-center">
          <Check strokeWidth={3} className="h-4 w-4 text-white" />
        </div>
      </div>
      <CaseCard caseData={caseData} />
    </div>
  )
}

export default function CaseSelectScreen() {
  const cases = useLoaderData<typeof loader>().cases
  const [showCases, setShowCases] = useState(false)
  const [selected, setSelected] = useState<Case | null>(null)

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center space-y-8 py-12 mx-8">
        <StaticChatMessage
          onFinished={() => {
            setShowCases(true)
          }}
          isFinished={showCases}
          text={`Below are some questions that have been posed to ChatGPT by users. Weigh in on how ChatGPT should respond to the user.\n\nSelect a user question to continue.`}
        />
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 mx-auto gap-4">
          {cases.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                "cursor-pointer transition-opacity ease-in duration-500",
                showCases
                  ? "hover:opacity-80 active:opacity-70 hover:duration-0 hover:transition-none opacity-100"
                  : "opacity-0",
                `delay-${i * 75}`
              )}
            >
              {c.id === selected?.id ? (
                <SelectedCaseCard caseData={c} />
              ) : (
                <CaseCard caseData={c} />
              )}
            </div>
          ))}
        </div>
        <div
          className={`flex flex-col justify-center items-center pt-4 transition-opacity ease-in duration-500 delay-525 ${showCases ? "opacity-100" : "opacity-0"
            }`}
        >
          <a href={selected ? `/case/${selected.id}/chat-explainer` : "#"}>
            <ContinueButton event="Selected Case" />
          </a>

          <div className="flex flex-col justify-center items-center my-4 h-4">
            {!selected && (
              <p className="text-stone-300">
                {`Select a user question to continue`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
