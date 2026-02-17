import { useState, useEffect } from "react"
import DragScrollRow from "../UI/DragScrollRow"

export function GameGrid({ slugs, autoScroll = false }) {
  const [games, setGames] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const slugList = slugs.split(",").map(s => {
    const raw = s.trim()
    const isFavorite = raw.endsWith("+")
    const slug = isFavorite ? raw.slice(0, -1) : raw
    return { slug, isFavorite }
  }).filter(item => item.slug)

  const uniqueSlugs = [...new Set(slugList.map(s => s.slug))]

  useEffect(() => {
    if (uniqueSlugs.length === 0) return

    let active = true
    const fetchGames = async () => {
      try {
        const res = await fetch("/api/igdb?action=gamesBatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: uniqueSlugs }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (active) { setGames(data); setLoading(false) }
      } catch {
        if (active) { setError(true); setLoading(false) }
      }
    }
    fetchGames()
    return () => { active = false }
  }, [slugs])

  if (slugList.length === 0) return null

  const items = autoScroll ? [...slugList, ...slugList, ...slugList] : slugList

  return (
    <div className="my-2">
      <DragScrollRow
        className={`gap-3 pb-4 pt-4 px-1 items-end ${autoScroll ? "overflow-x-hidden" : ""}`}
        autoScroll={autoScroll}
        autoScrollSpeed={0.04}
        loop={autoScroll}
      >
        {items.map(({ slug, isFavorite }, i) => (
          <GameCardCover
            key={`${slug}-${i}`}
            game={loading ? null : games?.[slug]}
            slug={slug}
            loading={loading}
            error={error}
            isFavorite={isFavorite}
          />
        ))}
      </DragScrollRow>
    </div>
  )
}

function GameCardCover({ game, slug, loading, error, isFavorite }) {
  if (loading) {
    return <div className="w-32 h-44 bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
  }

  if (error || !game) return null

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
