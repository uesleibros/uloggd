import { Link } from "react-router-dom"
import { Star, Calendar, ExternalLink } from "lucide-react"
import { PlatformList } from "@components/Game/PlatformBadge"

const NO_COVER = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
const MAX_SUMMARY = 180

function trimSummary(text, max = MAX_SUMMARY) {
  if (!text || text.length <= max) return text
  const trimmed = text.slice(0, max)
  const lastSpace = trimmed.lastIndexOf(" ")
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + "…"
}

export function GameResult({ game }) {
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null
  const coverUrl = game.cover?.url?.replace("t_thumb", "t_cover_big") || NO_COVER
  const rating = game.aggregated_rating || game.rating

  return (
    <Link
      to={`/game/${game.slug}`}
      className="group flex items-start gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-900 hover:border-zinc-700 transition-all"
    >
      <div className="flex-shrink-0 self-start relative overflow-hidden rounded-lg bg-zinc-800 w-16 h-20 sm:w-20 sm:h-28">
        <img
          src={coverUrl}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
              {game.name}
            </h3>
            <ExternalLink className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-zinc-400">
            {year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {year}
              </span>
            )}
            {rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                {Math.round(rating)}
              </span>
            )}
            {game.genres?.[0] && (
              <span className="text-zinc-500">{game.genres[0].name}</span>
            )}
          </div>

          {game.summary && (
            <p className="mt-2 text-sm text-zinc-500 line-clamp-2 hidden sm:block">
              {trimSummary(game.summary)}
            </p>
          )}
        </div>

        {game.platforms && (
          <div className="mt-3 hidden sm:block">
            <PlatformList platforms={game.platforms} variant="compact" max={5} />
          </div>
        )}
      </div>
    </Link>
  )
}