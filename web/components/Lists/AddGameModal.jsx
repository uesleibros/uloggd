import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import PlatformIcons from "@components/Game/PlatformIcons"
import { formatDateShort } from "#utils/formatDate"
import { Search, X, Plus, Check, Gamepad2 } from "lucide-react"

export default function AddGameModal({ isOpen, onClose, listId, existingSlugs = [], onAdded }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [recentlyAdded, setRecentlyAdded] = useState([])
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setResults([])
      setRecentlyAdded([])
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/igdb/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        })
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function handleAdd(game) {
    setAdding(game.slug)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/lists/@me/addItem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ listId, gameId: game.id, gameSlug: game.slug }),
      })

      if (!res.ok) throw new Error()
      const item = await res.json()
      onAdded(item)
      setRecentlyAdded(prev => [...prev, game.slug])
    } catch {} finally {
      setAdding(null)
    }
  }

  const allAdded = [...existingSlugs, ...recentlyAdded]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar jogo" maxWidth="max-w-lg" fullscreenMobile showMobileGrip>
      <div className="flex flex-col h-full">
        <div className="p-5 pb-4 sm:p-6 sm:pb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Procurar jogos..."
              className="w-full pl-10 pr-10 py-3 sm:py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6 min-h-0 max-h-[55vh] md:max-h-96">
          {searching && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-16">Nenhum resultado encontrado</p>
          )}

          {!searching && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-600">Digite para buscar jogos</p>
            </div>
          )}

          {!searching && results.map(game => {
            const alreadyAdded = allAdded.includes(game.slug)
            const isAdding = adding === game.slug

            return (
              <div
                key={game.id}
                className="flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0"
              >
                <Link to={`/game/${game.slug}`} target="_blank" className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {game.cover ? (
                    <img src={`https:${game.cover.url}`} alt="" className="h-14 w-10 sm:h-12 sm:w-9 rounded object-cover bg-zinc-800" />
                  ) : (
                    <div className="h-14 w-10 sm:h-12 sm:w-9 rounded bg-zinc-800 flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/game/${game.slug}`} target="_blank" className="text-sm font-medium text-white hover:text-indigo-400 transition-colors truncate block" onClick={e => e.stopPropagation()}>
                    {game.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {game.first_release_date && (
                      <span className="text-xs text-zinc-500">{formatDateShort(game.first_release_date)}</span>
                    )}
                    <PlatformIcons icons={game.platformIcons} />
                  </div>
                </div>

                {alreadyAdded ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 px-2.5 py-2 sm:py-1.5 bg-emerald-500/10 rounded-lg flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adicionado</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(game)}
                    disabled={isAdding}
                    className="px-3 py-2 sm:py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                  >
                    {isAdding ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Adicionar</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {recentlyAdded.length > 0 && (
          <div className="px-5 sm:px-6 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              {recentlyAdded.length} jogo{recentlyAdded.length !== 1 ? "s" : ""} adicionado{recentlyAdded.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}