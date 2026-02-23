import { useState, useEffect, useCallback, useRef } from "react"
import { PER_PAGE } from "../constants"

const ENDPOINTS = {
  games: "/api/igdb/search",
  users: "/api/users/search",
  lists: "/api/lists/search",
}

export function useSearch(initialQuery = "", initialTab = "games") {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [filters, setFilters] = useState({ sort: "relevance" })
  const [page, setPage] = useState(1)

  const [results, setResults] = useState({ games: [], users: [], lists: [] })
  const [counts, setCounts] = useState({ games: 0, users: 0, lists: 0 })
  const [totalPages, setTotalPages] = useState({ games: 0, users: 0, lists: 0 })
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const abortRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const fetchTab = useCallback(async (tab, pageNum = 1) => {
    if (!debouncedQuery.trim()) {
      setResults(prev => ({ ...prev, [tab]: [] }))
      setCounts(prev => ({ ...prev, [tab]: 0 }))
      setTotalPages(prev => ({ ...prev, [tab]: 0 }))
      return
    }

    try {
      const response = await fetch(ENDPOINTS[tab], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: debouncedQuery,
          limit: PER_PAGE,
          offset: (pageNum - 1) * PER_PAGE,
          ...filters,
        }),
      })

      if (!response.ok) throw new Error()

      const data = await response.json()
      const items = Array.isArray(data) ? data : data.results || []
      const total = data.total ?? items.length

      setResults(prev => ({ ...prev, [tab]: items }))
      setCounts(prev => ({ ...prev, [tab]: total }))
      setTotalPages(prev => ({ ...prev, [tab]: Math.ceil(total / PER_PAGE) }))
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err)
    }
  }, [debouncedQuery, filters])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ games: [], users: [], lists: [] })
      setCounts({ games: 0, users: 0, lists: 0 })
      setTotalPages({ games: 0, users: 0, lists: 0 })
      setLoading(false)
      setInitialLoad(false)
      return
    }

    setLoading(true)

    Promise.all([
      fetchTab("games", 1),
      fetchTab("users", 1),
      fetchTab("lists", 1),
    ]).finally(() => {
      setLoading(false)
      setInitialLoad(false)
    })
  }, [debouncedQuery, fetchTab])

  useEffect(() => {
    if (!debouncedQuery.trim() || initialLoad) return

    setLoading(true)
    fetchTab(activeTab, page).finally(() => setLoading(false))
  }, [page, activeTab, filters])

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    setPage(1)
    setFilters({ sort: "relevance" })
  }, [])

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return {
    query,
    setQuery,
    debouncedQuery,
    activeTab,
    setActiveTab: handleTabChange,
    filters,
    setFilters,
    page,
    setPage: handlePageChange,
    results,
    counts,
    totalPages,
    loading,
    initialLoad,
  }
}