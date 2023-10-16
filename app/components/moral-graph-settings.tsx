import React from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from '@radix-ui/react-separator';
import { capitalize, cn } from '~/utils';

export type GraphSettings = {
  run: "prolific_50" | "prolific_325" | "prolific_125" | null
  caseId: "abortion" | "weapons" | "parenting" | null
  politicalAffiliation: "democrat" | "republican" | null
  visualizeEdgeCertainty: boolean
  visualizeWisdomScore: boolean
}

export const defaultGraphSettings: GraphSettings = {
  run: "prolific_325",
  caseId: null,
  politicalAffiliation: null,
  visualizeEdgeCertainty: true,
  visualizeWisdomScore: true,
}

const caseQuestions = {
  "abortion": "I am a christian girl and am considering getting an abortion – what should I do?",
  "parenting": "My 10-year-old son refuses to do his homework, spending all his time at his computer instead. How can I make him behave properly?",
  "weapons": "Can you describe what weapons the Jan 6th rioters used?",
}


export default function MoralGraphSettings({ initialSettings, onUpdateSettings }: { initialSettings: GraphSettings, onUpdateSettings: (newSettings: GraphSettings) => void }) {
  const [settings, setSettings] = React.useState<GraphSettings>(initialSettings)

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l-2 border-border bg-white px-6 py-8">
      <h2 className="text-lg font-bold mb-6">Graph Settings</h2>

      {/* Run Dropdown */}
      <div className="mb-4">
        <Label htmlFor="run">Participants</Label>
        <Select onValueChange={(value: any) => {
          setSettings({ ...settings, run: value !== "all" ? value : null })
        }}>
          <SelectTrigger id="run">
            <SelectValue placeholder={settings.run ? "US Representative Sample" : "All Participants"} />
          </SelectTrigger>
          <SelectContent defaultValue={settings.run ?? "all"}>
            <SelectItem value="all">All Participants</SelectItem>
            <SelectItem value="prolific_325">US Representative Sample</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {settings.run && (
        <p className="text-xs text-gray-400 mb-4">
          Show values from a subset of participants representative of the US (age, sex, political affiliation).
        </p>
      )}


      {/* Case Dropdown */}
      <div className="mb-4">
        <Label htmlFor="run">Case</Label>
        <Select onValueChange={(value: any) => {
          setSettings({ ...settings, caseId: value !== "all" ? value: null })
        }}>
          <SelectTrigger id="run">
            <SelectValue placeholder={settings.caseId ? capitalize(settings.caseId) : "All Cases"} />
          </SelectTrigger>
          <SelectContent defaultValue={settings.caseId ?? "all"}>
            <SelectItem value="all">All Cases</SelectItem>
            <SelectItem value="abortion">Abortion</SelectItem>
            <SelectItem value="weapons">Weapons</SelectItem>
            <SelectItem value="parenting">Parenting</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {settings.caseId && (
        <p className="text-xs text-gray-400 mb-4">
          Show values articulated when users were asked how they think ChatGPT should respond to:
          <br />
          <br />
         <strong>"{caseQuestions[settings.caseId]}"</strong>
        </p>
      )}



      {/* Political Affiliation - @TODO */}
      {/* <div>
        <Label htmlFor="run">Politics</Label>
        <Select onValueChange={(politicalAffiliation: "democrat" | "republican" | "all") => {
          setSettings({ ...settings, politicalAffiliation })
        }}>
          <SelectTrigger id="run">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent defaultValue={settings.politicalAffiliation}>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="democrats">Democrats</SelectItem>
            <SelectItem value="republican">Republican</SelectItem>
          </SelectContent>
        </Select>
      </div> */}

      <Separator className="my-4 bg-border h-[1px]" />


      {/* Checkboxes */}
      <div className="flex items-center space-x-2 mb-4 mt-4">
        <Checkbox id="edge" checked={settings.visualizeEdgeCertainty} onCheckedChange={(c: any) => {
          setSettings({ ...settings, visualizeEdgeCertainty: c })
        }}/>
        <label
          htmlFor="edge"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Visualize Edge Certainty
        </label>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Edge certainty is the likelihood participants agree on a wisdom upgrade. Visualized as the thickness of the edges.
      </p>

      <div className="flex items-center space-x-2 mb-4">
        <Checkbox id="node" checked={settings.visualizeWisdomScore} onCheckedChange={(c: any) => {
          console.log("#Checked change; ", c)
          setSettings({ ...settings, visualizeWisdomScore: c })
        }} />
        <label
          htmlFor="node"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Visualize Wisdom Score
        </label>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        The wisdom score for a value is the sum of the certainty of all incoming edges. Visualized as the blueness of the nodes.
      </p>

      <Button disabled={initialSettings === settings} className="mt-4" onClick={() => {
        console.log(settings)
        onUpdateSettings(settings)
      }}>
        Update Graph
      </Button>
    </div>
  );
};