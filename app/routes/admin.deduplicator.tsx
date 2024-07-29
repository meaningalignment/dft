import { DeduplicatedCard } from "@prisma/client";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ValuesCard from "~/components/values-card";
import { db } from "~/config.server";

import { ClusterableObject, cluster } from "~/values-tools/deduplicator2";

export async function loader() {
  const cards = await db.$queryRawUnsafe<Array<ClusterableObject>>(`SELECT id, "title", "instructionsShort", "instructionsDetailed", "evaluationCriteria", embedding::real[] FROM "DeduplicatedCard" WHERE generation = ${generation}`);
  const clusters = cluster(cards, {
    epsilon: 0.11,
    minPoints: 2,
  }) as unknown as Array<Array<DeduplicatedCard>>;
  return json({ clusters, numCards: cards.length })
}

export default function CardClustersScreen() {
  const { clusters, numCards } = useLoaderData<typeof loader>()
  return (
    <div className="flex flex-col w-screen">
      <div className="grid flex-grow place-items-center space-y-8 py-12 mx-3">
        <div className="flex flex-col justify-center items-center">
          <h1 className="text-3xl text-center">
            <b>{clusters.length}</b> Clusters ({numCards} cards)
          </h1>
        </div>
        {clusters.map((cluster, i) => (
          <>
            <h1> Cluster {i} - {cluster.length} cards </h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-auto gap-4 items-start">
              {cluster.map((card) => (
                <ValuesCard card={card} />
              ))}
            </div>
          </>
        ))}
      </div>
    </div>
  )
}
