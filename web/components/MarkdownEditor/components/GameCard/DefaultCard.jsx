import { Link } from "react-router-dom"
import { PlatformList } from "@components/Game/PlatformBadge"
import { MiniStars } from "@components/Game/GameCard"

const NO_COVER = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

export function DefaultCard({ game, rating }) {
  const year = game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear() 
    : null
  const coverUrl = game.cover?.url || NO_COVER
  const hasRating = rating != null && rating > 0

  return (
    <div className="my-8 text-left mx-auto group relative w-full max-w-2xl overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-300 shadow-lg">
      <div className="absolute inset-0 z-0">
        {game.artworks?.[0]?.url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm scale-110 transition-transform duration-700 group-hover:scale-105" 
            style={{ backgroundImage: `url(${game.artworks[0].url})` }} 
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 to-zinc-900/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-900/60" />
      </div>

      <div className="relative z-10 p-4 sm:p-5 flex gap-4 sm:gap-6 items-start">
        <Link to={`/game/${game.slug}`} className="shrink-0 relative group/cover">
          <img 
            src={coverUrl} 
            alt={game.name} 
            className="w-20 sm:w-24 rounded-lg shadow-xl shadow-black/50 border border-zinc-700/50 group-hover/cover:ring-2 ring-indigo-500/50 transition-all aspect-[3/4] object-cover" 
          />
        </Link>

        <div className="flex-1 min-w-0 flex flex-col h-full justify-between gap-2 text-left">
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
                <Link to={`/game/${game.slug}`} className="hover:text-indigo-400 transition-colors">
                  {game.name}
                </Link>
              </h4>
              {hasRating && <MiniStars rating={rating} />}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-zinc-400">
              {year && <span className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700/50">{year}</span>}
              {game.developers?.[0] && <><span className="text-zinc-600">•</span><span>{game.developers[0]}</span></>}
              {game.genres?.[0] && <><span className="text-zinc-600">•</span><span>{game.genres[0].name}</span></>}
            </div>
          </div>

          <p className="text-sm text-zinc-300/90 line-clamp-2 leading-relaxed text-shadow-sm">
            {game.summary || "Sem descrição."}
          </p>

          {game.platforms && (
            <PlatformList platforms={game.platforms} variant="compact" max={4} gapClass="gap-1.5" className="mt-auto pt-1" />
          )}
        </div>
      </div>
    </div>
  )
}
