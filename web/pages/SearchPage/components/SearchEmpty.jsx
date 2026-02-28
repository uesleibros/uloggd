import { SearchX, Gamepad2, Users, ListMusic } from "lucide-react"
import { useTranslation } from "@hooks/useTranslation"

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
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {t("empty.startTitle")}
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm">
          {t("empty.startDescription")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
        <SearchX className="w-10 h-10 text-zinc-600" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {t("empty.noResultsTitle")}
      </h3>
      <p className="text-sm text-zinc-500 max-w-sm">
        {t("empty.noResultsDescription", { query })}
      </p>
    </div>
  )
}

export function SearchLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse">
          <div className="w-16 h-20 sm:w-20 sm:h-28 bg-zinc-800 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-5 bg-zinc-800 rounded w-2/3" />
            <div className="h-4 bg-zinc-800/50 rounded w-1/3" />
            <div className="h-4 bg-zinc-800/30 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}