import { Link } from "react-router-dom"
import { ListMusic, Gamepad2, ExternalLink } from "lucide-react"

export function ListResult({ list }) {
  return (
    <Link
      to={`/list/${list.shortId}`}
      className="group flex gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-900 hover:border-zinc-700 transition-all"
    >
      <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center group-hover:border-indigo-500/40 transition-colors">
        <ListMusic className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
            {list.title}
          </h3>
          <ExternalLink className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
        </div>

        {list.description && (
          <p className="mt-1 text-sm text-zinc-500 line-clamp-1">
            {list.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-zinc-500" />
            {list.games_count} {list.games_count === 1 ? "jogo" : "jogos"}
          </span>

          {list.owner && (
            <span className="text-zinc-500">
              por <span className="text-zinc-400">{list.owner.username}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}