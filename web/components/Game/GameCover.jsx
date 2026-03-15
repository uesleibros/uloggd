const COVER_FALLBACK = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

export function getCoverUrl(game, customCoverUrl = null) {
  if (customCoverUrl) return customCoverUrl
  if (!game?.cover?.url) return COVER_FALLBACK
  return game.cover.url.startsWith("http") ? game.cover.url : `https:${game.cover.url}`
}

export default function GameCover({ 
  game, 
  customCoverUrl = null,
  className = "",
  alt = null,
  draggable = false,
  loading = false,
}) {
  if (loading) {
    return <GameCoverSkeleton className={className} />
  }

  const url = getCoverUrl(game, customCoverUrl)

  return (
    <img
      src={url}
      alt={alt || game?.name || ""}
      draggable={draggable}
      className={`object-cover select-none bg-zinc-800 ${className}`}
    />
  )
}

export function GameCoverSkeleton({ className = "" }) {
  return <div className={`bg-zinc-800 animate-pulse ${className}`} />
}
