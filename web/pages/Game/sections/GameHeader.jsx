import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import RatingBadge from "@components/Game/RatingBadge"
import { formatDateLong } from "#utils/formatDate"

export function GameHeader({ game, isMobile = false }) {
  const { t } = useTranslation("game")

  if (isMobile) {
    return (
      <div className="flex-1 md:hidden min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{game.name}</h1>
        {game.first_release_date && (
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
            {formatDateLong(game.first_release_date)}
          </p>
        )}
        <div className="flex gap-4 mt-3">
          <RatingBadge score={game.total_rating} label={t("header.ratings.total")} size="sm" />
          <RatingBadge score={game.aggregated_rating} label={t("header.ratings.critics")} size="sm" />
          <RatingBadge score={game.rating} label={t("header.ratings.users")} size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="hidden md:block">
      <h1 className="text-4xl font-bold text-white">{game.name}</h1>
      {game.first_release_date && (
        <p className="text-sm text-zinc-400 mt-2 mb-6">{formatDateLong(game.first_release_date)}</p>
      )}
      <div className="flex gap-6 mb-6">
        <RatingBadge score={game.total_rating} label={t("header.ratings.total")} />
        <RatingBadge score={game.aggregated_rating} label={t("header.ratings.critics")} />
        <RatingBadge score={game.rating} label={t("header.ratings.users")} />
      </div>
    </div>
  )
}

export function ParentGameLink({ parentGame }) {
  const { t } = useTranslation("game")

  if (!parentGame) return null

  return (
    <>
      <Link
        to={`/game/${parentGame.slug}`}
        className="mt-6 flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 group"
      >
        {parentGame.cover ? (
          <img
            src={`https:${parentGame.cover.url}`}
            alt={parentGame.name}
            className="w-10 h-14 rounded object-cover bg-zinc-700 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-14 rounded bg-zinc-700 flex-shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{t("header.parentGame")}</span>
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors truncate">
            {parentGame.name}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white ml-auto flex-shrink-0 transition-colors" />
      </Link>
      <hr className="my-6 border-zinc-700" />
    </>
  )
}
