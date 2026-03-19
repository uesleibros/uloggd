import { Link } from "react-router-dom"
import { useMyLibrary } from "#hooks/useMyLibrary"
import PlatformIcons from "@components/Game/PlatformIcons"
import GameTypeBadge from "@components/Game/GameTypeBadge"
import GameCover from "@components/Game/GameCover"
import { formatDateShort } from "#utils/formatDate"

export default function GameResultItem({
  game,
  onSelect,
  isSelected = false,
  showLinks = true,
  renderActions,
  variant = "default",
}) {
  const { getGameData } = useMyLibrary()
  const gameData = getGameData(game.slug)

  const coverElement = (
    <GameCover
      game={game}
      customCoverUrl={gameData?.customCoverUrl}
      className={variant === "compact" ? "h-12 w-9 rounded" : "h-14 w-10 sm:h-12 sm:w-9 rounded"}
    />
  )

  const content = (
    <>
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
        {game.gameType && game.gameType !== "main" && (
          <div className="mb-0.5">
            <GameTypeBadge type={game.gameType} />
          </div>
        )}

        {showLinks ? (
          <Link
            to={`/game/${game.slug}`}
            target="_blank"
            className="text-sm font-medium text-white hover:text-indigo-400 transition-colors truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {game.name}
          </Link>
        ) : (
          <span className="text-sm font-medium text-white truncate block">
            {game.name}
          </span>
        )}

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
    </>
  )

  if (variant === "compact") {
    return (
      <li
        onMouseDown={() => onSelect?.(game)}
        className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">{content}</div>
      </li>
    )
  }

  return (
    <div
      onClick={() => onSelect?.(game)}
      className={`flex items-center gap-3 py-3 px-3 border-b border-zinc-800/50 last:border-0 transition-colors ${
        onSelect ? "cursor-pointer hover:bg-zinc-800/30" : ""
      } ${isSelected ? "bg-indigo-500/10" : ""}`}
    >
      {content}
    </div>
  )
}
