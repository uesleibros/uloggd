import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { Search, Gamepad2, Users, ListMusic, ArrowRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import PlatformIcons from "@components/Game/PlatformIcons"
import UserDisplay from "@components/User/UserDisplay"
import { formatDateShort } from "#utils/formatDate"
import { LoadingSpinner } from "./icons"

const TABS = [
  { id: "games", icon: Gamepad2 },
  { id: "users", icon: Users },
  { id: "lists", icon: ListMusic },
]

function GameResult({ item, onSelect }) {
  return (
    <li
      onMouseDown={() => onSelect(`/game/${item.slug}`)}
      className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        {item.cover ? (
          <img
            src={`https:${item.cover.url}`}
            alt=""
            className="h-12 w-9 rounded object-cover bg-zinc-800 flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-9 rounded bg-zinc-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
            {item.name}
          </span>
          <div className="flex items-center gap-2 mt-1">
            {item.first_release_date && (
              <span className="text-xs text-zinc-500">
                {formatDateShort(item.first_release_date)}
              </span>
            )}
            <PlatformIcons icons={item.platformIcons} />
          </div>
        </div>
      </div>
    </li>
  )
}

function UserResult({ item, onSelect }) {
  return (
    <li
      onMouseDown={() => onSelect(`/u/${item.username}`)}
      className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <UserDisplay user={item} size="sm" showUsername={false} showStatus={false} />
        <div className="flex-1 min-w-0">
          <span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
            {item.username}
          </span>
        </div>
      </div>
    </li>
  )
}

function ListResult({ item, onSelect, t }) {
  return (
    <li
      onMouseDown={() => onSelect(`/list/${item.shortId}`)}
      className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <ListMusic className="w-5 h-5 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
            {item.title}
          </span>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{t("search.gamesCount", { count: item.games_count })}</span>
            {item.owner && (
              <>
                <span>•</span>
                <span>{t("search.byUser", { username: item.owner.username })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function SearchResults({ results, loading, activeTab, onSelect, onViewAll, query, t }) {
  const ResultComponent = {
    games: GameResult,
    users: UserResult,
    lists: (props) => <ListResult {...props} t={t} />,
  }[activeTab]

  if (loading) return <LoadingSpinner />

  if (!results || results.length === 0) {
    return (
      <div className="px-3 py-6 text-sm text-zinc-500 text-center">
        {t("search.noResults")}
      </div>
    )
  }

  return (
    <>
      <ul className="py-1">
        {results.map((item) => (
          <ResultComponent
            key={item.id || item._id || item.username || item.shortId}
            item={item}
            onSelect={onSelect}
          />
        ))}
      </ul>
      <button
        onMouseDown={onViewAll}
        className="w-full px-3 py-2.5 border-t border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2"
      >
        {t("search.viewAll", { query })}
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  )
}

function TabBar({ activeTab, onChange, counts, t }) {
  return (
    <div className="flex border-b border-zinc-800">
      {TABS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onChange(id)
          }}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === id
              ? "text-indigo-400 border-b-2 border-indigo-400 -mb-px"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {t(`search.tabs.${id}`)}
          {counts[id] > 0 && (
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded-full">
              {counts[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SearchBar({ variant = "desktop", onSelect, className = "" }) {
  const { t } = useTranslation("header")

  const [query, setQuery] = useState("")
  const [results, setResults] = useState({ games: [], users: [], lists: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("games")

  const searchTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const mountedRef = useRef(true)
  const lastQueryRef = useRef("")

  const navigate = useNavigate()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeoutRef.current)

    const trimmed = query.trim()
    lastQueryRef.current = trimmed

    if (!trimmed) {
      setResults({ games: [], users: [], lists: [] })
      setLoading(false)
      setOpen(false)
      return
    }

    setLoading(true)
    setOpen(true)

    searchTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current) return
      if (lastQueryRef.current !== trimmed) return

      try {
        const [gamesRaw, usersRaw, listsRaw] = await Promise.all([
          fetch(`/api/igdb/autocomplete?query=${encodeURIComponent(trimmed)}`).then(r => r.json()).catch(() => []),
          fetch(`/api/users/search?query=${encodeURIComponent(trimmed)}&limit=5`).then(r => r.json()).catch(() => []),
          fetch(`/api/lists/search?query=${encodeURIComponent(trimmed)}&limit=5`).then(r => r.json()).catch(() => []),
        ])

        if (!mountedRef.current) return
        if (lastQueryRef.current !== trimmed) return

        setResults({
          games: gamesRaw || [],
          users: usersRaw || [],
          lists: listsRaw || [],
        })
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }, 400)

    return () => clearTimeout(searchTimeoutRef.current)
  }, [query])

  function handleNavigate(path) {
    setQuery("")
    setOpen(false)
    setResults({ games: [], users: [], lists: [] })
    onSelect?.()
    navigate(path)
  }

  function handleViewAll() {
    handleNavigate(`/search?q=${encodeURIComponent(query)}&tab=${activeTab}`)
  }

  const counts = {
    games: results.games.length,
    users: results.users.length,
    lists: results.lists.length,
  }

  const showDropdown = open && (loading || counts.games || counts.users || counts.lists)

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="h-8 w-48 lg:w-64 pl-9 pr-3 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full right-0 w-96 mt-1.5 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden z-50">
          <TabBar activeTab={activeTab} onChange={setActiveTab} counts={counts} t={t} />
          <div className="max-h-80 overflow-y-auto">
            <SearchResults
              results={results[activeTab]}
              loading={loading}
              activeTab={activeTab}
              onSelect={handleNavigate}
              onViewAll={handleViewAll}
              query={query}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  )
}
