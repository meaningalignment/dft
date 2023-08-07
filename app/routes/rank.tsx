import { Button } from "~/components/ui/button"
import Header from "~/components/header"
import { Link, useLoaderData } from "@remix-run/react"
import { LoaderArgs, json } from "@remix-run/node"
import { db } from "~/config.server"
import ValuesCard from "~/components/values-card"
import { ChatMessage } from "~/components/chat-message"
import { useState } from "react"
import { ValuesCard as DataModel } from "@prisma/client"
import { IconCheck } from "~/components/ui/icons"

export async function loader({ request }: LoaderArgs) {
  const values = await db.valuesCard.findMany({ take: 6 })
  return json({ values })
}

function CheckmarkCircle() {
  return (
    <div className="bg-blue-500 h-8 w-8 rounded-full flex flex-col justify-center items-center">
      <IconCheck className="h-6 w-6 text-white" />
    </div>
  )
}

function SelectedValuesCardTest({ value }: { value: DataModel }) {
  return (
    <div className="relative h-full w-full">
      <div className="w-full h-full border-4 border-blue-500 rounded-xl z-10 absolute" />
      <div className="absolute -bottom-2 -right-2 z-20">
        <CheckmarkCircle />
      </div>
      <ValuesCard card={value as any} />
    </div>
  )
}

function SelectableValue({
  isSelected,
  onSelect,
  value,
}: {
  isSelected: boolean
  onSelect: () => void
  value: DataModel
}) {
  return (
    <div
      onClick={onSelect}
      className={"cursor-pointer hover:opacity-80 active:opacity-70"}
    >
      {isSelected ? (
        <SelectedValuesCardTest value={value} />
      ) : (
        <ValuesCard card={value as any} />
      )}
    </div>
  )
}

export default function RankScreen() {
  const { values } = useLoaderData<typeof loader>()
  const [selectedValues, setSelectedValues] = useState<number[]>([])

  const onSelectValue = (id: number) => {
    if (selectedValues.includes(id)) {
      setSelectedValues(selectedValues.filter((v) => v !== id))
    } else {
      setSelectedValues([...selectedValues, id])
    }

    console.log(selectedValues)
  }

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <div className="grid flex-grow place-items-center space-y-4 py-12 px-8">
        <div className="max-w-2xl">
          <ChatMessage
            message={{
              id: "1",
              role: "assistant",
              content: `Here are some examples of how others have answered. Your next task is to determine which of these values you think are wisest to consider for ChatGPT talking to the girl.\n\nSelect the responses you think are wise to consider by clicking on them.`,
            }}
            hideActions={true}
          />
        </div>
        <div className="grid xl:grid-cols-3 lg:grid-cols-2 mx-auto gap-4">
          {values.map((value) => (
            <SelectableValue
              key={value.id}
              isSelected={selectedValues.includes(value.id)}
              onSelect={() => onSelectValue(value.id)}
              value={value as any}
            />
          ))}
        </div>
        <div className="flex flex-col justify-center items-center">
          <Button disabled={selectedValues.length < 3}>
            <Link to="/link">Continue</Link>
          </Button>

          <div className="flex flex-col justify-center items-center mt-4 h-4">
            {selectedValues.length < 3 && (
              <p className="text-stone-300">
                {`Select ${3 - selectedValues.length} more value${
                  selectedValues.length === 2 ? "" : "s"
                } to continue`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
