import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { PlatformList } from "@components/Game/PlatformBadge"
import RatingBadge from "@components/Game/RatingBadge"
import QuickActions from "@components/Game/QuickActions"
import ReviewButton from "@components/Game/Review"
import { AgeRatings } from "../components/AgeRatings"
import { Websites } from "../components/Websites"
import { Keywords } from "../components/Keywords"
import { formatDateLong } from "#utils/formatDate"

function GameCover({ game }) {
  if (game.cover) {
    return (
      <img
        src={`https:${game.cover.url}`}
        alt={game.name}
        className="w-32 sm:w-48 md:w-64 rounded-lg shadow-2xl bg-zinc-800 select-none flex-shrink-0"
      />
    )
  }

  return (
    <div className="w-32 h-48 sm:w-48 sm:h-72 md:w-64 md:h-96 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
      <span className="text-zinc-500 text-xs sm:text-sm text-center px-2">{game.name}</span>
    </div>
  )
}

function MobileHeader({ game }) {
  const { t } = useTranslation("game")

  return (
    <div className="flex-1 min-w-0 md:hidden">
      <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{game.name}</h1>
      {game.first_release_date && (
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
          {formatDateLong(game.first_release_date)}
        </p>
      )}
      <div className="flex gap-4 mt-3">
        <RatingBadge score={game.total_rating} label={t("sidebar.ratings.total")} size="sm" />
        <RatingBadge score={game.aggregated_rating} label={t("sidebar.ratings.critics")} size="sm" />
        <RatingBadge score={game.rating} label={t("sidebar.ratings.users")} size="sm" />
      </div>
    </div>
  )
}

function ParentGameLink({ parentGame }) {
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
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{t("sidebar.parentGame")}</span>
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

export function GameSidebar({ game }) {
  const { t } = useTranslation("game")

  return (
    <div className="flex-shrink-0">
      <div className="flex flex-row md:flex-col gap-4 md:gap-0">
        <GameCover game={game} />
        <MobileHeader game={game} />
      </div>

      <div className="mt-4 md:hidden">
        <QuickActions game={game} />
        <ReviewButton game={game} />
      </div>

      <ParentGameLink parentGame={game.parent_game} />

      {game.ageRatings?.length > 0 && (
        <div className="mt-4 hidden md:block">
          <h2 className="text-lg font-semibold text-white mb-4">{t("sidebar.ageRatings")}</h2>
          <AgeRatings ratings={game.ageRatings} />
        </div>
      )}

      <div className="hidden md:block">
        <Websites websites={game.websites} />
        <hr className="my-6 border-zinc-700" />

        {game.platforms?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">{t("sidebar.platforms")}</h2>
            <PlatformList
              platforms={game.platforms}
              variant="badge"
              className="max-w-sm"
              badgeClassName="hover:bg-zinc-700/50 transition-colors"
            />
          </div>
        )}

        <Keywords keywords={game.keywords} />
      </div>
    </div>
  )
}
