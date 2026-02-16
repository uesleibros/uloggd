import { useState, useEffect } from "react"
import { PlatformList } from "../Game/PlatformBadge"

export function GameCard({ slug, variant = "default", isFavorite = false }) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const fetchGame = async () => {
      try {
        const res = await fetch("/api/igdb/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (active) { setGame(data); setLoading(false) }
      } catch {
        if (active) { setError(true); setLoading(false) }
      }
    }
    fetchGame()
    return () => { active = false }
  }, [slug])

  if (loading) {
    if (variant === "mini") {
      return (
        <div className="flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md my-2 animate-pulse">
          <div className="w-10 h-14 bg-zinc-800 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
      )
    }
    if (variant === "cover") {
      return <div className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
    }
    return (
      <div className="my-6 relative w-full max-w-2xl overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-4 select-none">
        <div className="w-20 h-28 sm:w-24 sm:h-32 bg-zinc-800 rounded-lg shrink-0 animate-pulse" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-5 bg-zinc-800 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-zinc-800/50 rounded w-1/3 animate-pulse" />
          <div className="h-12 bg-zinc-800/30 rounded w-full mt-2 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !game) {
    if (variant === "cover") return null
    return (
      <div className="my-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 max-w-max">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Jogo não encontrado: <span className="font-mono">{slug}</span>
      </div>
    )
  }

  const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null

  if (variant === "mini") {
    return (
      <div className="flex items-center gap-3 p-2 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-700/50 hover:border-zinc-600 rounded-lg w-full max-w-md my-2 transition-all group">
        <a href={`/game/${game.slug}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
          <img 
            src={game.cover?.url || "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"} 
            alt={game.name} 
            className="w-10 h-14 rounded object-cover shadow-sm bg-zinc-800"
          />
        </a>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <a href={`/game/${game.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-indigo-400 truncate transition-colors">
            {game.name}
          </a>
          
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {year && <span>{year}</span>}
            {year && game.genres?.[0] && <span>•</span>}
            {game.genres?.[0] && <span className="truncate">{game.genres[0].name}</span>}
          </div>
        </div>
      </div>
    )
  }

  if (variant === "cover") {
    return (
      <div className="relative group flex-shrink-0">
        {isFavorite && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-amber-400 drop-shadow-md">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 256 256">
              <path d="M239.2,97.29a16,16,0,0,0-13.81-9.43l-56.76-2.41L146.45,32.61a16,16,0,0,0-28.9,0L95.37,85.45,38.61,87.86a16,16,0,0,0-9.11,28.06l43.57,37.63L59.66,208.8a16,16,0,0,0,24.16,17.56L128,197.69l44.18,28.67a16,16,0,0,0,24.16-17.56l-13.41-55.25,43.57-37.63A16,16,0,0,0,239.2,97.29Zm-32.06,47.76,11.2,46.16L179.6,166.1a16,16,0,0,0-16.74-.49L128,187.37l-34.86-21.76a16,16,0,0,0-16.74.49l-38.74,25.11,11.2-46.16a16,16,0,0,0-5.08-15.63L47.36,97.77l47.42-2a16,16,0,0,0,13.26-9.64L128,41.22l19.95,44.91a16,16,0,0,0,13.26,9.64l47.42,2-36.42,31.65A16,16,0,0,0,207.14,145.05Z" opacity="0.2"/>
              <path d="M239.2,97.29a16,16,0,0,0-13.81-9.43l-56.76-2.41L146.45,32.61a16,16,0,0,0-28.9,0L95.37,85.45,38.61,87.86a16,16,0,0,0-9.11,28.06l43.57,37.63L59.66,208.8a16,16,0,0,0,24.16,17.56L128,197.69l44.18,28.67a16,16,0,0,0,24.16-17.56l-13.41-55.25,43.57-37.63A16,16,0,0,0,239.2,97.29Z"/>
            </svg>
          </div>
        )}

        <a 
          href={`/game/${game.slug}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`block relative rounded-lg transition-transform duration-300 group-hover:shadow-xl ${
            isFavorite 
              ? "ring-2 ring-amber-500/70 shadow-lg shadow-amber-500/10"
              : "border border-zinc-800/50 group-hover:border-zinc-600"
          }`}
          title={game.name}
        >
          <img
            src={game.cover?.url || "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"}
            alt={game.name}
            className="w-32 h-44 object-cover select-none rounded-lg bg-zinc-800"
            draggable={false}
          />
          
          <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2 pointer-events-none">
            <span className="text-white text-xs font-medium text-center leading-tight line-clamp-3">
              {game.name}
            </span>
          </div>
        </a>
      </div>
    )
  }

  return (
    <div className="my-8 group relative w-full max-w-3xl overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-300 shadow-lg">
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
        <a href={`/game/${game.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group/cover">
          <img
            src={game.cover?.url || "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"}
            alt={game.name}
            className="w-20 sm:w-24 rounded-lg shadow-xl shadow-black/50 border border-zinc-700/50 group-hover/cover:ring-2 ring-indigo-500/50 transition-all aspect-[3/4] object-cover"
          />
        </a>

        <div className="flex-1 min-w-0 flex flex-col h-full justify-between gap-2">
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-white leading-tight truncate">
              <a href={`/game/${game.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">
                {game.name}
              </a>
            </h4>
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