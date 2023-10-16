import { Await, useLoaderData } from "@remix-run/react";
import { Suspense, useEffect, useState } from "react";
import { LoaderArgs, defer, json } from "@remix-run/node";
import { MoralGraph } from "~/components/moral-graph";
import { Options, summarizeGraph } from "~/values-tools/generate-moral-graph";
import { Loader2 } from "lucide-react";
import MoralGraphSettings, { GraphSettings, defaultGraphSettings } from "~/components/moral-graph-settings";
import { db } from "~/config.server";

function LoadingScreen() {
  return <div className="h-screen w-full mx-auto flex items-center justify-center">
    <Loader2 className="h-4 w-4 animate-spin" />
  </div>
}

export default function DefaultGraphPage() {
  const [settings, setSettings] = useState<GraphSettings>(defaultGraphSettings)
  const [graph, setGraph] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    if (!graph && !isLoading) {
      fetchGraph(settings)
    }
  }, [])

  const fetchGraph = async (settings: GraphSettings) => {
    setIsLoading(true)

    const params: { caseId?: string, runId?: string } = {}
    if (settings?.caseId) params.caseId = settings?.caseId
    if (settings?.run) params.runId = settings?.run

    const res = await fetch("/api/data/edges?" + new URLSearchParams(params).toString(), {
      headers: {
        "Content-Type": "application/json",
      },
    })
    console.log(res)
    const graph = await res.json()
    console.log(graph)
    setGraph(graph)
    setIsLoading(false)
  }

  function onUpdateSettings(newSettings: GraphSettings) {
    console.log(newSettings)
    setSettings(newSettings)
    fetchGraph(newSettings)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Graph */}
      <div className="flex-grow">
        {isLoading || !graph ? <LoadingScreen /> : <MoralGraph nodes={graph.values} edges={graph.edges} visualizeEdgeCertainty={settings.visualizeEdgeCertainty} visualizeNodeCertainty={settings.visualizeWisdomScore} />}
      </div>

      {/* Settings */}
      <div className="hidden md:block flex-shrink-0 max-w-sm">
        <MoralGraphSettings initialSettings={settings} onUpdateSettings={onUpdateSettings} />
      </div>
    </div>
  )
}
