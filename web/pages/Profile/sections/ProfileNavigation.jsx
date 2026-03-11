import { User, Gamepad2, ListChecks, LayoutGrid, MessageSquare, Heart, Receipt, BookOpen } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"

const PROFILE_SECTIONS = [
  { id: "profile", icon: User },
  { id: "games", icon: Gamepad2 },
  { id: "journeys", icon: BookOpen },
  { id: "lists", icon: ListChecks },
  { id: "tierlists", icon: LayoutGrid },
  { id: "reviews", icon: MessageSquare },
  { id: "likes", icon: Heart },
  { id: "transactions", icon: Receipt },
]

export function ProfileNavigation({
  activeSection,
  onSectionChange,
  counts,
  journeysCount,
  listsCount,
  tierlistsCount,
  reviewsCount,
  likesCount,
  transactionsCount,
}) {
  const { t } = useTranslation("profile")

  return (
    <div className="border-b border-zinc-800/80">
      <DragScrollRow className="-mb-px">
        <nav className="flex gap-1 w-max">
          {PROFILE_SECTIONS.map(({ id, icon: Icon }) => {
            const isActive = activeSection === id
            let badge = null

            if (id === "games" && counts?.total > 0) badge = counts.total
            if (id === "journeys" && journeysCount > 0) badge = journeysCount
            if (id === "lists" && listsCount > 0) badge = listsCount
            if (id === "tierlists" && tierlistsCount > 0) badge = tierlistsCount
            if (id === "reviews" && reviewsCount > 0) badge = reviewsCount
            if (id === "likes" && likesCount > 0) badge = likesCount
            if (id === "transactions" && transactionsCount > 0) badge = transactionsCount

            return (
              <button
                key={id}
                onClick={() => onSectionChange(id)}
                className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-indigo-400" : "text-zinc-600 group-hover:text-zinc-400"
                  }`}
                />
                {t(`navigation.${id}`)}
                {badge != null && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full tabular-nums transition-colors ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-400"
                        : "bg-zinc-800 text-zinc-500 group-hover:text-zinc-400"
                    }`}
                  >
                    {badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-500 rounded-t-full" />
                )}
              </button>
            )
          })}
        </nav>
      </DragScrollRow>
    </div>
  )
}
