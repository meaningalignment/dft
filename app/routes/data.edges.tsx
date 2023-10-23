import { useEffect, useState } from "react";
import { MoralGraph } from "~/components/moral-graph";
import { Loader2 } from "lucide-react";
import MoralGraphSettings, { GraphSettings, defaultGraphSettings } from "~/components/moral-graph-settings";

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
      fetchData(settings)
    }
  }, [])

  const fetchData = async (settings: GraphSettings) => {
    setIsLoading(true)
    
    const headers = { "Content-Type": "application/json" }
    const params: { caseId?: string, runId?: string } = {}

    if (settings?.caseId) params.caseId = settings?.caseId
    if (settings?.run) params.runId = settings?.run

    const graph = await fetch("/api/data/edges?" + new URLSearchParams(params).toString(), { headers }).then((res) => res.json())

    setGraph(graph)
    setIsLoading(false)
  }

  function onUpdateSettings(newSettings: GraphSettings) {
    setSettings(newSettings)
    fetchData(newSettings)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      {/* Graph */}
      <div className="flex-grow">
        {isLoading || !graph ? <LoadingScreen /> : <MoralGraph nodes={graph.values} edges={graph.edges} settings={settings} />}
      </div>

      {/* Settings */}
      <div className="hidden md:block flex-shrink-0 max-w-sm">
        <MoralGraphSettings initialSettings={settings} onUpdateSettings={onUpdateSettings} />
      </div>
    </div>
  )
}
