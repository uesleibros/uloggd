import { useMemo } from "react"
import { Link } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import { PlatformList } from "@components/Game/PlatformBadge"
import GameCard, { GameCardSkeleton, MiniStars } from "@components/Game/GameCard"
import { useGamesBatch } from "#hooks/useGamesBatch"

export function MarkdownGameCard({ slug, variant = "default", isFavorite = false, authorRatings = {} }) {
  const slugs = useMemo(() => [slug], [slug])
  const { loading, getGame } = useGamesBatch(slugs)

  const authorRating = authorRatings[slug]?.avgRating
  const game = getGame(slug)

  if (loading && !game) {
    if (variant === "mini") return <MiniCardSkeleton />
    if (variant === "cover") return <GameCardSkeleton />
    return <DefaultCardSkeleton />
  }

  if (!game) {
    if (variant === "cover") return null
    return <ErrorCard slug={slug} />
  }

  if (variant === "mini") {
    return <MiniCard game={game} rating={authorRating} showRating={true} />
  }

  if (variant === "cover") {
    return (
      <GameCard
        game={game}
        isFavorite={isFavorite}
        userRating={authorRating}
        showRating={true}
      />
    )
  }

  return <DefaultCard game={game} rating={authorRating} showRating={true} />
}

function MiniCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm my-2 animate-pulse">
      <div className="w-12 h-16 bg-zinc-800 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
  )
}

function DefaultCardSkeleton() {
  return (
    <div className="my-6 relative w-full min-w-2xl max-w-2xl overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-4 select-none">
      <div className="w-20 h-28 sm:w-24 sm:h-32 bg-zinc-800 rounded-lg shrink-0 animate-pulse" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-5 bg-zinc-800 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-zinc-800/50 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-zinc-800/30 rounded w-full mt-2 animate-pulse" />
      </div>
    </div>
  )
}

function ErrorCard({ slug }) {
  return (
    <div className="my-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 max-w-max">
      <AlertCircle className="w-4 h-4" />
      Jogo não encontrado: <span className="font-mono">{slug}</span>
    </div>
  )
}

function MiniCard({ game, rating, showRating }) {
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  const coverUrl = game.cover?.url || "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
  const hasRating = showRating && rating != null && rating > 0

  return (
    <div className="flex items-center gap-4 p-3 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl w-full max-w-sm my-2 transition-all group shadow-md hover:shadow-lg">
      <Link to={`/game/${game.slug}`} className="flex-shrink-0 relative group/img overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors z-10" />
        <img
          src={coverUrl}
          alt={game.name}
          className="w-12 h-16 object-cover shadow-md bg-zinc-800 transition-transform group-hover/img:scale-105"
        />
      </Link>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 text-left">
        <Link
          to={`/game/${game.slug}`}
          className="text-[15px] font-bold text-zinc-100 hover:text-indigo-400 truncate transition-colors leading-tight"
        >
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

function DefaultCard({ game, rating, showRating }) {
  const year = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  const coverUrl = game.cover?.url || "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"
  const hasRating = showRating && rating != null && rating > 0

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
              {game.developers?.[0] && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{game.developers[0]}</span>
                </>
              )}
              {game.genres?.[0] && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{game.genres[0].name}</span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-zinc-300/90 line-clamp-2 leading-relaxed text-shadow-sm">
            {game.summary || "Sem descrição."}
          </p>

          {game.platforms && (
            <PlatformList
              platforms={game.platforms}
              variant="compact"
              max={4}
              gapClass="gap-1.5"
              className="mt-auto pt-1"
            />
          )}
        </div>
      </div>
    </div>
  )
}
