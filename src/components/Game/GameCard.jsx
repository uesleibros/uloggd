import { Link } from "react-router-dom"

const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"

function MiniStars({ rating }) {
  const stars = Math.round((rating / 20) * 2) / 2
  const clamped = Math.min(Math.max(stars, 0), 5)
  const full = Math.floor(clamped)
  const half = clamped % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-px">
      {Array.from({ length: full }, (_, i) => (
        <svg key={`f${i}`} className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
      ))}
      {half && (
        <div className="relative w-3 h-3">
          <svg className="absolute inset-0 w-full h-full text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
          <svg className="absolute inset-0 w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24" style={{ clipPath: "inset(0 50% 0 0)" }}><path d={STAR_PATH} /></svg>
        </div>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <svg key={`e${i}`} className="w-3 h-3 text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
      ))}
    </div>
  )
}

export default function GameCard({ game, userRating }) {
  const hasRating = userRating != null && userRating > 0

  return (
    <Link
      to={`/game/${game.slug}`}
      className="flex-shrink-0 group relative"
    >
      {game.cover ? (
        <>
          <img
            src={`https:${game.cover.url}`}
            alt={game.name}
            draggable={false}
            className="w-32 h-44 object-cover select-none rounded-lg bg-zinc-800"
          />
          <div className="absolute inset-0 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 gap-1.5">
            <span className="text-white select-none text-xs font-medium text-center leading-tight line-clamp-3">
              {game.name}
            </span>
            {hasRating && <MiniStars rating={userRating} />}
          </div>
        </>
      ) : (
        <div className="w-32 h-44 bg-zinc-800 rounded-lg flex flex-col items-center justify-center gap-1.5 group">
          <span className="text-xs select-none text-zinc-500 text-center px-2">{game.name}</span>
          {hasRating && <MiniStars rating={userRating} />}
        </div>
      )}
    </Link>
  )
}
