import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, Gamepad2, Users, List, ArrowRight, SearchX } from "lucide-react"
import GameResultItem from "@components/Game/GameResultItem"
import UserDisplay from "@components/User/UserDisplay"
import { CoverStrip } from "@components/Lists/ListCard"
import { useTranslation } from "#hooks/useTranslation"
import { LoadingSpinner } from "./icons"

const TABS = [
  { id: "games", icon: Gamepad2 },
  { id: "users", icon: Users },
  { id: "lists", icon: List },
]

const ENDPOINTS = {
  games: (q) => `/api/igdb/autocomplete?query=${encodeURIComponent(q)}`,
  users: (q) => `/api/users/search?query=${encodeURIComponent(q)}&limit=5`,
  lists: (q) => `/api/lists/search?query=${encodeURIComponent(q)}&limit=5`,
}

function extractArray(res) {
  if (Array.isArray(res)) return res
  if (res && typeof res === "object") {
    if (Array.isArray(res.results)) return res.results
    if (Array.isArray(res.data)) return res.data
    if (Array.isArray(res.users)) return res.users
    if (Array.isArray(res.lists)) return res.lists
    if (Array.isArray(res.games)) return res.games
  }
  return []
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

function ListResult({ item, onSelect }) {
  const { t } = useTranslation()

  return (
    <li
      onMouseDown={() => onSelect(`/list/${item.shortId}`)}
      className="group cursor-pointer px-3 py-2.5 hover:bg-indigo-500/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700/50">
          <CoverStrip ownerId={item.user_id} slugs={(item.game_slugs || []).slice(0, 4)} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="group-hover:text-indigo-400 transition-colors font-medium text-sm text-white truncate block">
            {item.title}
          </span>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{t("header.search.gamesCount", { count: item.games_count })}</span>
            {item.owner && (
              <>
                <span>•</span>
                <span>{t("header.search.byUser", { username: item.owner.username })}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

function SearchResults({ results, loading, activeTab, onSelect, onViewAll, query }) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <SearchX className="w-6 h-6 text-zinc-600" />
        <p className="text-sm text-zinc-500">{t("header.search.noResults")}</p>
      </div>
    )
  }

  return (
    <>
      <ul className="py-1">
        {results.map((item) => {
          const key = item.id || item._id || item.username || item.shortId

          if (activeTab === "games") {
            return (
              <GameResultItem
                key={key}
                game={item}
                onSelect={() => onSelect(`/game/${item.slug}`)}
                variant="compact"
                showLinks={false}
              />
            )
          }

          if (activeTab === "users") {
            return <UserResult key={key} item={item} onSelect={onSelect} />
          }

          return <ListResult key={key} item={item} onSelect={onSelect} />
        })}
      </ul>
      <button
        onMouseDown={onViewAll}
        className="w-full px-3 py-2.5 border-t border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2"
      >
        {t("header.search.viewAll", { query })}
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  )
}

function TabBar({ activeTab, onChange, counts }) {
  const { t } = useTranslation()

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
          {t(`header.search.tabs.${id}`)}
          {counts[id] > 0 && (
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded-full">{counts[id]}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function SearchInput({ inputRef, query, onChange, onFocus, onBlur, onKeyDown, focused = false, variant = "desktop" }) {
  const { t } = useTranslation()

  const baseClasses = "rounded-md bg-zinc-800 text-sm text-white placeholder-zinc-500 outline-none border"

  const variants = {
    desktop: `h-8 w-48 lg:w-64 bg-zinc-800/80 pl-9 pr-3 transition-all duration-200 ${
      focused
        ? "border-zinc-600 bg-zinc-800 w-56 lg:w-72"
        : "border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
    }`,
    mobile: "h-10 w-full pl-10 pr-3 border-zinc-700",
  }

  return (
    <div className="relative">
      <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${focused ? "text-zinc-300" : "text-zinc-500"}`} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={t("header.search.placeholder")}
        className={`${baseClasses} ${variants[variant]}`}
      />
    </div>
  )
}

export function SearchBar({ variant = "desktop", onSelect, className = "" }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState({ games: [], users: [], lists: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeTab, setActiveTab] = useState("games")
  const [dropdownPos, setDropdownPos] = useState(null)
  const [completedQuery, setCompletedQuery] = useState("")

  const searchTimeoutRef = useRef(null)
  const blurTimeoutRef = useRef(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  const cacheRef = useRef({})

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    return () => {
      clearTimeout(searchTimeoutRef.current)
      clearTimeout(blurTimeoutRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  const updateDropdownPos = useCallback(() => {
    if (variant !== "mobile" || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    })
  }, [variant])

  useEffect(() => {
    if (!open || variant !== "mobile") return
    updateDropdownPos()
    window.addEventListener("scroll", updateDropdownPos, true)
    window.addEventListener("resize", updateDropdownPos)
    return () => {
      window.removeEventListener("scroll", updateDropdownPos, true)
      window.removeEventListener("resize", updateDropdownPos)
    }
  }, [open, variant, updateDropdownPos])

  const fetchResults = useCallback(async (searchQuery, tab) => {
    const cacheKey = `${searchQuery}:${tab}`

    if (cacheRef.current[cacheKey]) {
      setResults((prev) => ({ ...prev, [tab]: cacheRef.current[cacheKey] }))
      setCompletedQuery(searchQuery)
      setLoading(false)
      return
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch(ENDPOINTS[tab](searchQuery), {
        signal: abortControllerRef.current.signal,
      })
      const data = await res.json()
      const items = extractArray(data)

      cacheRef.current[cacheKey] = items
      setResults((prev) => ({ ...prev, [tab]: items }))
      setCompletedQuery(searchQuery)
    } catch (err) {
      if (err.name !== "AbortError") {
        setResults((prev) => ({ ...prev, [tab]: [] }))
        setCompletedQuery(searchQuery)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeoutRef.current)

    const trimmed = query.trim()

    if (!trimmed) {
      abortControllerRef.current?.abort()
      setResults({ games: [], users: [], lists: [] })
      setLoading(false)
      setOpen(false)
      setCompletedQuery("")
      return
    }

    setOpen(true)
    setLoading(true)

    searchTimeoutRef.current = setTimeout(() => {
      fetchResults(trimmed, activeTab)
    }, 300)

    return () => clearTimeout(searchTimeoutRef.current)
  }, [query, activeTab, fetchResults])

  function handleTabChange(tab) {
    if (tab === activeTab) return

    setActiveTab(tab)

    const trimmed = query.trim()
    if (!trimmed) return

    const cacheKey = `${trimmed}:${tab}`

    if (cacheRef.current[cacheKey]) {
      setResults((prev) => ({ ...prev, [tab]: cacheRef.current[cacheKey] }))
      return
    }

    setLoading(true)
    fetchResults(trimmed, tab)
  }

  function resetSearch() {
    clearTimeout(blurTimeoutRef.current)
    abortControllerRef.current?.abort()
    setQuery("")
    setOpen(false)
    setResults({ games: [], users: [], lists: [] })
    setCompletedQuery("")
  }

  function handleNavigate(path) {
    resetSearch()
    onSelect?.()
    navigate(path)
  }

  function handleViewAll() {
    const trimmed = query.trim()
    if (!trimmed) return

    const searchPath = `/search?q=${encodeURIComponent(trimmed)}&tab=${activeTab}`

    resetSearch()
    onSelect?.()

    if (location.pathname === "/search") {
      navigate(searchPath, { replace: true, state: { key: Date.now() } })
    } else {
      navigate(searchPath)
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault()
      handleViewAll()
    }
    if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  function handleFocus() {
    clearTimeout(blurTimeoutRef.current)
    setFocused(true)
    if (query.trim()) setOpen(true)
  }

  function handleBlur() {
    setFocused(false)
    clearTimeout(blurTimeoutRef.current)
    blurTimeoutRef.current = setTimeout(() => {
      if (inputRef.current === document.activeElement) return
      setOpen(false)
    }, 200)
  }

  const trimmedQuery = query.trim()
  const hasResults = completedQuery === trimmedQuery && trimmedQuery !== ""
  const showDropdown = open && trimmedQuery && (loading || hasResults)

  const counts = {
    games: results.games.length,
    users: results.users.length,
    lists: results.lists.length,
  }

  const dropdownContent = showDropdown ? (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className={`rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden ${
        variant === "desktop" ? "absolute top-full right-0 w-96 mt-1.5 z-50" : ""
      }`}
      style={
        variant === "mobile" && dropdownPos
          ? {
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }
          : undefined
      }
    >
      <TabBar activeTab={activeTab} onChange={handleTabChange} counts={counts} />
      <div className="max-h-80 overflow-y-auto">
        <SearchResults
          results={results[activeTab]}
          loading={loading}
          activeTab={activeTab}
          onSelect={handleNavigate}
          onViewAll={handleViewAll}
          query={query}
        />
      </div>
    </div>
  ) : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <SearchInput
        inputRef={inputRef}
        query={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        focused={focused}
        variant={variant}
      />
      {dropdownContent &&
        (variant === "mobile" ? createPortal(dropdownContent, document.body) : dropdownContent)}
    </div>
  )
}