import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, ArrowRight, SearchX } from "lucide-react"
import GameResultItem from "@components/Game/GameResultItem"
import { useTranslation } from "#hooks/useTranslation"
import { LoadingSpinner } from "./icons"

function SearchResults({ results, loading, onSelect, onViewAll, query }) {
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
        {results.map((game) => (
          <GameResultItem
            key={game.id}
            game={game}
            onSelect={() => onSelect(`/game/${game.slug}`)}
            variant="compact"
            showLinks={false}
          />
        ))}
      </ul>
      <button
        onMouseDown={onViewAll}
        className="w-full px-3 py-2.5 border-t border-zinc-800 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {t("header.search.viewAll", { query })}
        <ArrowRight className="w-4 h-4" />
      </button>
    </>
  )
}

function SearchInput({ inputRef, query, onChange, onFocus, onBlur, onKeyDown, focused, variant }) {
  const { t } = useTranslation()

  const baseClasses = "rounded-lg bg-zinc-800 text-sm text-white placeholder-zinc-500 outline-none border"

  const variantClasses = variant === "mobile"
    ? "h-10 w-full pl-10 pr-3 border-zinc-700"
    : `h-8 w-48 lg:w-64 bg-zinc-800/80 pl-9 pr-3 transition-all duration-200 ${
        focused
          ? "border-zinc-600 bg-zinc-800 w-56 lg:w-72"
          : "border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
      }`

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
        className={`${baseClasses} ${variantClasses}`}
      />
    </div>
  )
}

export function SearchBar({ variant = "desktop", onSelect, className = "" }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dropdownPos, setDropdownPos] = useState(null)

  const searchTimeoutRef = useRef(null)
  const blurTimeoutRef = useRef(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  const cacheRef = useRef({})

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

  useEffect(() => {
    clearTimeout(searchTimeoutRef.current)

    const trimmed = query.trim()

    if (!trimmed) {
      abortControllerRef.current?.abort()
      setResults([])
      setLoading(false)
      setOpen(false)
      return
    }

    if (cacheRef.current[trimmed]) {
      setResults(cacheRef.current[trimmed])
      setOpen(true)
      return
    }

    setOpen(true)
    setLoading(true)

    searchTimeoutRef.current = setTimeout(async () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      try {
        const res = await fetch(`/api/igdb/autocomplete?query=${encodeURIComponent(trimmed)}`, {
          signal: abortControllerRef.current.signal,
        })
        const data = await res.json()
        const items = Array.isArray(data) ? data : []

        cacheRef.current[trimmed] = items
        setResults(items)
      } catch (err) {
        if (err.name !== "AbortError") setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeoutRef.current)
  }, [query])

  function resetSearch() {
    clearTimeout(blurTimeoutRef.current)
    abortControllerRef.current?.abort()
    setQuery("")
    setOpen(false)
    setResults([])
  }

  function handleNavigate(path) {
    resetSearch()
    onSelect?.()
    navigate(path)
  }

  function handleViewAll() {
    const trimmed = query.trim()
    if (!trimmed) return

    const searchPath = `/search?q=${encodeURIComponent(trimmed)}`

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

  const trimmed = query.trim()
  const showDropdown = open && trimmed

  const dropdownContent = showDropdown ? (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className={`rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-xl overflow-hidden ${
        variant === "desktop" ? "absolute top-full right-0 w-80 mt-1.5 z-50" : ""
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
      <div className="max-h-80 overflow-y-auto">
        <SearchResults
          results={results}
          loading={loading}
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
      {dropdownContent && (variant === "mobile" ? createPortal(dropdownContent, document.body) : dropdownContent)}
    </div>
  )
}
