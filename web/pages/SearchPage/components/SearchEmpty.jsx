import { SearchX, Gamepad2, Users, ListMusic } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

const ICONS = {
  games: Gamepad2,
  users: Users,
  lists: ListMusic,
}

export function SearchEmpty({ query, activeTab }) {
  const { t } = useTranslation("search")
  const Icon = ICONS[activeTab] || SearchX

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Icon className="w-16 h-16 text-zinc-600 mb-4" />
        <h3 className="text-lg font-medium text-zinc-300 mb-1">
          {t("empty.startTitle")}
        </h3>
        <p className="text-sm text-zinc-500 max-w-xs">
          {t("empty.startDescription")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <SearchX className="w-16 h-16 text-zinc-600 mb-4" />
      <h3 className="text-lg font-medium text-zinc-300 mb-1">
        {t("empty.noResultsTitle")}
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs">
        {t("empty.noResultsDescription", { query })}
      </p>
    </div>
  )
}

export function SearchLoading() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg animate-pulse">
          <div className="w-14 h-20 sm:w-18 sm:h-24 bg-zinc-800 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-zinc-800 rounded w-3/5" />
            <div className="h-3.5 bg-zinc-800/60 rounded w-2/5" />
            <div className="h-3 bg-zinc-800/30 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
