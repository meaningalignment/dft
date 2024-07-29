import type { Collection, Share, User } from "@prisma/client";
import type { SerializeFrom } from "@remix-run/node";

export default function SpaceCard({ space }: { space: SerializeFrom<Collection & { createdBy: User, shares: Share[] }> }) {
  return (
    <div className="flex flex-col gap-2 flex-grow h-full">
      <div
        className={
          `border-2 border-border rounded-xl px-8 pt-8 pb-6 min-w-md h-full bg-white dark:bg-black dark:text-white flex flex-col`
        }
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Created by {space.createdBy.email}
        </p>
        <div className="text-lg font-semibold">{space.name}</div>

        <div className="text-md text-gray-700">{space.shares.length} Values</div>
      </div>
    </div>

  )
}