import { Search, X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export function SearchHeader({ query, onChange, onClear, totalResults, loading }) {
  const { t } = useTranslation("search")

  return (
    <div className="pt-6 pb-4">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">{t("header.title")}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {t("header.subtitle")}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("header.placeholder")}
          className="w-full h-10 pl-10 pr-10 bg-zinc-900 rounded-md text-white text-sm placeholder-zinc-500 focus:outline-none transition-colors"
          autoFocus
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {query && !loading && totalResults > 0 && (
        <p className="mt-3 text-xs text-zinc-500 uppercase font-semibold tracking-wide">
          {t("header.resultsFound", { count: totalResults.toLocaleString() })}
        </p>
      )}
    </div>
  )
}
