import { SlidersHorizontal, ChevronDown } from "lucide-react"
import { SORT_OPTIONS } from "../constants"

export function SearchFilters({ activeTab, filters, onChange, totalResults }) {
  const sortOptions = SORT_OPTIONS[activeTab] || []

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-800/50">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <SlidersHorizontal className="w-4 h-4" />
        <span>
          Mostrando <span className="text-white font-medium">{totalResults}</span> resultados
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">Ordenar:</span>
        <div className="relative">
          <select
            value={filters.sort || "relevance"}
            onChange={(e) => onChange({ ...filters, sort: e.target.value })}
            className="appearance-none h-9 pl-3 pr-9 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white cursor-pointer hover:border-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>
    </div>
  )
}