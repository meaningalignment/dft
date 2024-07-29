import type { IdeaParticipants, PinnedIdea, User } from "@prisma/client";

function BadgeGrid({ participants }: { participants: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {participants.map((participant) => (
        <div key={participant} className="
        bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-bold px-2 py-1 rounded-md border border-border border-1">
          {participant}
        </div>
      ))}
    </div>
  );
}

type Props = {
  idea: PinnedIdea & { user: User } & { participants?: IdeaParticipants[] }
  showUser?: boolean
  children?: React.ReactNode
}

function splitIdea(idea: string): { description: string, participantNames: string[] } {
  const words = idea.split(' ')
  const description = words.filter((w: string) => !w.startsWith('@')).join(' ').replace(/^- /, '')
  const participantNames = words.filter((w: string) => w.startsWith('@')).map((w: string) => w.slice(1))

  return { description, participantNames }
}


export type IdeaWithParticipants = PinnedIdea & {
  user: User,
  IdeaParticipants?: {
    participant: {
      name: string | null,
      email: string
    }
  }[]
}

// Map old idea model to new one, if necessary.
function standardizeIdea(idea: IdeaWithParticipants): Omit<PinnedIdea, "idea"> & { user: User, participantNames: string[] } {
  const isLegacy = idea.title === 'OLD'

  if (isLegacy) {
    const title = "Event Idea"
    const { description, participantNames } = splitIdea(idea.idea)
    return { ...idea, title, description, participantNames }
  }

  const participantNames = idea.IdeaParticipants?.map((p) => p.participant.name || p.participant.email) || []

  return { ...idea, participantNames }
}

export default function IdeaCard({ idea, children }: Props) {
  const standardizedIdea = standardizeIdea(idea) // Backwards compatibility.

  return (
    <div className="flex flex-col gap-2 flex-grow h-full">
      <div
        className={
          `border-2 border-border rounded-xl px-8 pt-8 pb-6 max-w-sm h-full bg-white dark:bg-black dark:text-white flex flex-col`
        }
      >
        <p className="text-md font-semibold">{standardizedIdea.title}</p>
        <p className="text-sm">{standardizedIdea.description}</p>
        <div className="mt-4 mb-2">
          <BadgeGrid participants={standardizedIdea.participantNames} />
        </div>
        {children}
        <div className="flex-grow" />
      </div>
    </div>
  )
}


export function IdeaCardWithUser({ idea }: Props) {
  const standardizedIdea = standardizeIdea(idea) // Backwards compatibility.

  return (
    <div className="flex flex-col gap-2 flex-grow h-full">
      <div className="text-lg font-semibold ml-3">{idea.user.name || idea.user.email}</div>

      <div
        className={
          `border-2 border-border rounded-xl px-8 pt-8 pb-6 max-w-sm h-full bg-white dark:bg-black dark:text-white flex flex-col`
        }
      >
        {/* <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Pinned by {standardizedIdea.user.name || standardizedIdea.user.email || "Anonymous"}
        </p> */}
        <p className="text-md font-semibold">{standardizedIdea.title}</p>
        <p className="text-sm">{standardizedIdea.description}</p>
        <div className="mt-4 mb-2">
          <BadgeGrid participants={standardizedIdea.participantNames} />
        </div>
        <div className="flex-grow" />
      </div>
    </div>
  )
}