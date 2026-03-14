import { Link } from "react-router-dom"
import { MiniStars } from "@components/Game/GameCard"
import GameCover from "@components/Game/GameCover"

export function MiniCard({ game, rating, customCoverUrl = null }) {
  const year = game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear() 
    : null
  const hasRating = rating != null && rating > 0

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl w-full max-w-md my-2 transition-all group shadow-md hover:shadow-lg">
      <Link to={`/game/${game.slug}`} className="flex-shrink-0 relative group/img overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors z-10" />
        <GameCover game={game} customCoverUrl={customCoverUrl} className="w-16 h-22 rounded-lg shadow-md transition-transform group-hover/img:scale-105" />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 text-left">
        <Link to={`/game/${game.slug}`} className="text-base font-bold text-zinc-100 hover:text-indigo-400 truncate transition-colors leading-tight">
          {game.name}
        </Link>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-500">
          {hasRating && (
            <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700/50">
              <MiniStars rating={rating} size={12} />
            </div>
          )}
          {(year || game.genres?.[0]) && (
            <div className="flex items-center gap-2 truncate">
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
