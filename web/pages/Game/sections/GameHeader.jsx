import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useMyLibrary } from "#hooks/useMyLibrary"
import RatingBadge from "@components/Game/RatingBadge"
import GameCover from "@components/Game/GameCover"
import { useDateTime } from "#hooks/useDateTime"

export function GameHeader({ game }) {
  const { t } = useTranslation("game")
  const { formatDateLong } = useDateTime()

  return (
    <div className="hidden lg:block">
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
        {game.name}
      </h1>
      {game.first_release_date && (
        <p className="text-sm text-zinc-500 mt-2 mb-6 font-medium">
          {formatDateLong(game.first_release_date)}
        </p>
      )}
      {!game.first_release_date && <div className="mb-6" />}
      <div className="flex items-center gap-6 mb-6">
        <RatingBadge score={game.total_rating} label={t("header.ratings.total")} />
        <RatingBadge score={game.aggregated_rating} label={t("header.ratings.critics")} />
        <RatingBadge score={game.rating} label={t("header.ratings.users")} />
      </div>
    </div>
  )
}

export function ParentGameLink({ parentGame }) {
  const { t } = useTranslation("game")
  const { getGameData } = useMyLibrary()

  if (!parentGame) return null

  const parentData = getGameData(parentGame.slug)

  return (
    <Link
      to={`/game/${parentGame.slug}`}
      className="flex items-center gap-3 px-4 py-3 bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all duration-200 group"
    >
      <GameCover
        game={parentGame}
        customCoverUrl={parentData?.customCoverUrl}
        className="w-10 h-14 rounded-lg flex-shrink-0"
      />
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
          {t("header.parentGame")}
        </span>
        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors truncate">
          {parentGame.name}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 ml-auto flex-shrink-0 transition-colors" />
    </Link>
  )
}
