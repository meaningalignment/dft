import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ArrowDown } from "lucide-react";
import ValuesCard from "~/components/values-card";
import { db } from "~/config.server";

export async function loader() {
  const allCards = await db.canonicalValuesCard.findMany()
  const upgrades = await db.edge.groupBy({
    by: ["fromId", "toId"],
    where: {
      relationship: "upgrade"
    },
    orderBy: {
      _count: {
        relationship: "desc"
      }
    },
    _count: {
      _all: true
    }
  })
  return json({ allCards, upgrades })
}

export default function AdminUpgradesScreen() {
  const { allCards, upgrades } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1 className="text-3xl font-bold my-8 text-center">
        Upgrades
      </h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-auto gap-4">
        {
          upgrades.map((u) => (
            <div className="flex flex-col justify-center items-center">
              <div className="text-2xl">
                {u._count._all}
              </div>
              <div className="text-xs">
                {u.fromId} to {u.toId}
              </div>
              <ValuesCard card={allCards.find((c) => c.id === u.fromId)} />
              <ArrowDown className="w-8 h-8" />
              <ValuesCard card={allCards.find((c) => c.id === u.toId)} />
            </div>
          ))
        }
      </div>
    </div>
  )
}