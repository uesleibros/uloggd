import { useState, useEffect } from "react"
import { PlatformList } from "../PlatformBadge"

export function GameCard({ slug }) {
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
    return (
      <div className="my-6 relative w-full max-w-2xl mx-auto overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-4 select-none">
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
    return (
      <div className="my-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 max-w-max">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Jogo não encontrado: <span className="font-mono">{slug}</span>
      </div>
    )
  }

  const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null
  const score = game.total_rating ? Math.round(game.total_rating) : null

  let scoreColor = "bg-zinc-700 text-zinc-300 border-zinc-600"
  if (score >= 75) scoreColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
  else if (score >= 50) scoreColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  else if (score > 0) scoreColor = "bg-red-500/20 text-red-400 border-red-500/30"

  return (
    <div className="my-8 group relative w-full max-w-3xl mx-auto overflow-hidden rounded-xl bg-zinc-900 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-300 shadow-lg">
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
          {score && (
            <div className={`absolute -top-2 -right-2 ${scoreColor} border backdrop-blur-md px-1.5 py-0.5 rounded text-xs font-bold shadow-lg`}>
              {score}
            </div>
          )}
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