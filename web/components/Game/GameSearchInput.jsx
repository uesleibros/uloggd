import { useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "#hooks/useTranslation"
import { useMyLibrary } from "#hooks/useMyLibrary"
import PlatformIcons from "@components/Game/PlatformIcons"
import GameTypeBadge from "@components/Game/GameTypeBadge"
import GameCover from "@components/Game/GameCover"
import { formatDateShort } from "#utils/formatDate"

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

function GameResultItem({
  game,
  onSelect,
  isSelected,
  showLinks,
  showGameType,
  renderActions,
}) {
  const { getGameData } = useMyLibrary()
  const gameData = getGameData(game.slug)

  const coverElement = (
    <GameCover
      game={game}
      customCoverUrl={gameData?.customCoverUrl}
      className="h-14 w-10 sm:h-12 sm:w-9 rounded"
    />
  )

  const nameElement = showLinks ? (
    <Link
      to={`/game/${game.slug}`}
      target="_blank"
      className="text-sm font-medium text-white hover:text-indigo-400 transition-colors truncate"
      onClick={(e) => e.stopPropagation()}
    >
      {game.name}
    </Link>
  ) : (
    <span className="text-sm font-medium text-white truncate">
      {game.name}
    </span>
  )

  return (
    <div
      onClick={() => onSelect?.(game)}
      className={`flex items-center gap-3 py-3 px-3 border-b border-zinc-800/50 last:border-0 transition-colors ${
        onSelect ? "cursor-pointer hover:bg-zinc-800/30" : ""
      } ${isSelected ? "bg-indigo-500/10" : ""}`}
    >
      {showLinks ? (
        <Link
          to={`/game/${game.slug}`}
          target="_blank"
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {coverElement}
        </Link>
      ) : (
        <div className="flex-shrink-0">{coverElement}</div>
      )}

      <div className="flex-1 min-w-0">
        {showGameType && game.gameType && game.gameType !== "main" && (
          <div className="mb-1">
            <GameTypeBadge type={game.gameType} />
          </div>
        )}

        <div className="truncate">
          {nameElement}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {game.first_release_date && (
            <span className="text-xs text-zinc-500">
              {formatDateShort(game.first_release_date)}
            </span>
          )}
          <PlatformIcons icons={game.platformIcons} />
        </div>

        {game.parentGame && (
          <p className="text-xs text-zinc-600 mt-0.5 truncate">
            {game.parentGame}
          </p>
        )}
      </div>

      {renderActions && (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {renderActions(game, isSelected)}
        </div>
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
  showGameType = true,
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
          showGameType={showGameType}
          renderActions={renderActions}
        />
      ))}
    </div>
  )
}
