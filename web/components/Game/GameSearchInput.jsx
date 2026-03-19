import { useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import GameResultItem from "@components/Game/GameResultItem"

export function GameSearchInput({
  query,
  onQueryChange,
  onClear,
  placeholder,
  autoFocus = false,
  className = "",
}) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [autoFocus])

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
      />
      {query && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export function GameSearchResults({
  results,
  searching,
  query,
  onSelect,
  selectedGameId,
  emptyMessage,
  typeToSearchMessage,
  renderActions,
  showLinks = true,
}) {
  const { t } = useTranslation()

  if (searching) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <Search className="w-8 h-8 text-zinc-700" />
        <p className="text-sm text-zinc-600">
          {typeToSearchMessage || t("common.typeToSearch")}
        </p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-16">
        {emptyMessage || t("common.noResults")}
      </p>
    )
  }

  return (
    <div>
      {results.map((game) => (
        <GameResultItem
          key={game.id}
          game={game}
          onSelect={onSelect}
          isSelected={selectedGameId === game.id}
          showLinks={showLinks}
          renderActions={renderActions}
        />
      ))}
    </div>
  )
}
