import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { Search, X, Plus, Check, Gamepad2, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import Modal from "@components/UI/Modal"
import { formatDateShort } from "#utils/formatDate"
import { query } from "#lib/igdbWrapper.js"

const MAX_ITEMS = 500
const MAX_NOTE = 200
const DEBOUNCE_MS = 400

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debounced
}

function GameSearchResult({ game, onSelect, isSelected, isAdding }) {
  const { t } = useTranslation("lists.addGame")
  const coverUrl = game.cover?.url
    ? `https:${game.cover.url.replace("t_thumb", "t_cover_small")}`
    : null

  return (
    <button
      type="button"
      onClick={() => onSelect(game)}
      disabled={isAdding}
      className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-lg transition-all ${
        isSelected
          ? "bg-indigo-500/10 border border-indigo-500/30"
          : "hover:bg-zinc-800/50 border border-transparent"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="h-12 w-9 rounded object-cover bg-zinc-800 flex-shrink-0"
        />
      ) : (
        <div className="h-12 w-9 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Gamepad2 className="w-4 h-4 text-zinc-600" />
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm font-medium text-white truncate">{game.name}</div>
        {game.first_release_date && (
          <div className="text-xs text-zinc-500">
            {formatDateShort(game.first_release_date)}
          </div>
        )}
      </div>

      {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
    </button>
  )
}

export default function AddGameModal({ isOpen, onClose, listId, onAdded }) {
  const { t } = useTranslation("lists.addGame")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [recentlyAdded, setRecentlyAdded] = useState([])
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS)

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setResults([])
      setRecentlyAdded([])
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    setError(null)

    query("games", `fields id,name,slug,cover.url,first_release_date; search "${debouncedQuery}"; limit 20;`)
      .then((data) => setResults(Array.isArray(data) ? data : []))
      .catch(() => setError(t("searchError")))
      .finally(() => setSearching(false))
  }, [debouncedQuery, t])

  const handleAdd = async (game) => {
    if (adding || recentlyAdded.includes(game.slug)) return

    setAdding(game.slug)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setError(t("authRequired"))
        return
      }

      const res = await fetch("/api/lists/@me/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listId,
          gameId: game.id,
          gameSlug: game.slug,
          note: null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "fail")
      }

      const newItem = await res.json()
      setRecentlyAdded((prev) => [...prev, game.slug])
      onAdded?.(newItem)
      onClose()
    } catch (err) {
      setError(err.message === "max 500 items" ? t("maxItemsError") : t("addError"))
    } finally {
      setAdding(null)
    }
  }

  const isDisabled = !query.trim() && !results.length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      maxWidth="max-w-lg"
      showMobileGrip
      className="!bg-zinc-900 !border-zinc-700"
    >
      <div className="flex flex-col h-full">
        <div className="px-5 sm:px-6 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-10 pr-10 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("")
                  setResults([])
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 min-h-0">
          {error && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          {!error && !query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Search className="w-10 h-10 text-zinc-700" />
              <p className="text-sm text-zinc-600">{t("typeToSearch")}</p>
            </div>
          )}

          {!error && query.trim() && results.length === 0 && !searching && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Gamepad2 className="w-10 h-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">{t("noResults")}</p>
            </div>
          )}

          {!error && results.length > 0 && (
            <div className="space-y-1 py-2">
              {results.map((game) => {
                const alreadyAdded = recentlyAdded.includes(game.slug)
                const isAddingThis = adding === game.slug

                return (
                  <GameSearchResult
                    key={game.id}
                    game={game}
                    onSelect={handleAdd}
                    isSelected={alreadyAdded}
                    isAdding={isAddingThis}
                  />
                )
              })}
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={adding}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
