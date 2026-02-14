import { Link } from "react-router-dom"

export default function GameCard({ game }) {
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
            className="w-32 h-44 object-cover rounded-lg bg-zinc-800"
          />
          <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2">
            <span className="text-white text-sm font-medium text-center leading-tight">
              {game.name}
            </span>
          </div>
        </>
      ) : (
        <div className="w-32 h-44 bg-zinc-800 rounded-lg flex items-center justify-center">
          <span className="text-xs text-zinc-500 text-center px-2">{game.name}</span>
        </div>
      )}
    </Link>
  )
}