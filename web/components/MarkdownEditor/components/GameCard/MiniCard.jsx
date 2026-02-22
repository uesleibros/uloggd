import { Link } from "react-router-dom"
import { MiniStars } from "@components/Game/GameCard"

const NO_COVER = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

export function MiniCard({ game, rating }) {
  const year = game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear() 
    : null
  const coverUrl = game.cover?.url || NO_COVER
  const hasRating = rating != null && rating > 0

  return (
    <div className="flex items-center gap-4 p-3 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl w-full max-w-sm my-2 transition-all group shadow-md hover:shadow-lg">
      <Link to={`/game/${game.slug}`} className="flex-shrink-0 relative group/img overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors z-10" />
        <img src={coverUrl} alt={game.name} className="w-12 h-16 object-cover shadow-md bg-zinc-800 transition-transform group-hover/img:scale-105" />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 text-left">
        <Link to={`/game/${game.slug}`} className="text-[15px] font-bold text-zinc-100 hover:text-indigo-400 truncate transition-colors leading-tight">
          {game.name}
        </Link>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          {hasRating && (
            <div className="flex items-center gap-1.5 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
              <MiniStars rating={rating} size={10} />
            </div>
          )}
          {(year || game.genres?.[0]) && (
            <div className="flex items-center gap-1.5 truncate">
              {year && <span>{year}</span>}
              {year && game.genres?.[0] && <span className="text-zinc-700">•</span>}
              {game.genres?.[0] && <span className="truncate text-zinc-400">{game.genres[0].name}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
