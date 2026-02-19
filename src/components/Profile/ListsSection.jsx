import { Link } from "react-router-dom"
import { List, Plus, Lock, ChevronRight } from "lucide-react"

export default function ListsSection({ lists = [], isOwnProfile, username }) {
  const isEmpty = lists.length === 0

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <List className="w-5 h-5 text-zinc-400" />
          Listas
          {!isEmpty && <span className="text-sm text-zinc-500 font-normal">{lists.length}</span>}
        </h2>
        {isOwnProfile && (
          <button className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            Criar lista
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 bg-zinc-800/20 border border-zinc-800 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
            <List className="w-6 h-6" />
          </div>
          <p className="text-sm text-zinc-500">
            {isOwnProfile ? "Você ainda não criou nenhuma lista." : `${username} ainda não criou nenhuma lista.`}
          </p>
          {isOwnProfile && (
            <button className="mt-1 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Criar primeira lista
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lists.map(list => (
            <Link key={list.id} to={`/list/${list.id}`} className="group bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl p-4 transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-700/50 group-hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors">
                  <List className="w-5 h-5 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{list.name}</h3>
                  {list.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{list.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-zinc-600">{list.games_count || 0} jogos</span>
                    {list.is_public === false && (
                      <span className="text-xs text-zinc-600 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Privada
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}