// components/MarkdownEditor/GameCard.jsx

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
  const score = game.total_rating ? Math.round(game.total_rating) : null

  let scoreColor = "text-zinc-400 bg-zinc-800/50 border-zinc-700"
  if (score >= 75) scoreColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  else if (score >= 50) scoreColor = "text-amber-400 bg-amber-500/10 border-amber-500/20"
  else if (score > 0) scoreColor = "text-red-400 bg-red-500/10 border-red-500/20"

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
          <div className="flex items-center justify-between gap-2">
            <a href={`/game/${game.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-indigo-400 truncate transition-colors">
              {game.name}
            </a>
            {score && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                {score}
              </span>
            )}
          </div>
          
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
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M11.7 2.805a.75.75 0 0 1 .6 0A16.002 16.002 0 0 0 16.736 4.5 16.004 16.004 0 0 0 21 3.688a.75.75 0 0 1 .865 1.185l-3.66 4.63a.75.75 0 0 0 .157.94l5.3 5.3a.75.75 0 0 1-.53 1.28H.868a.75.75 0 0 1-.53-1.28l5.3-5.3a.75.75 0 0 0 .157-.94l-3.66-4.63a.75.75 0 0 1 .865-1.185A16.004 16.004 0 0 0 7.264 4.5 16.002 16.002 0 0 0 11.7 2.805Z" />
            </svg>
          </div>
        )}

        <a 
          href={`/game/${game.slug}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`block relative rounded-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl ${
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

  let fullScoreColor = "bg-zinc-700 text-zinc-300 border-zinc-600"
  if (score >= 75) fullScoreColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
  else if (score >= 50) fullScoreColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  else if (score > 0) fullScoreColor = "bg-red-500/20 text-red-400 border-red-500/30"

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
          {score && (
            <div className={`absolute -top-2 -right-2 ${fullScoreColor} border backdrop-blur-md px-1.5 py-0.5 rounded text-xs font-bold shadow-lg`}>
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