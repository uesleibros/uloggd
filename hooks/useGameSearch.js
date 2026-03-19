import { useState, useEffect, useRef, useCallback } from "react"

export function useGameSearch({ enabled = true, debounceMs = 400 } = {}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    const trimmed = query.trim()

    if (!trimmed) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/igdb/autocomplete?query=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [query, enabled, debounceMs])

  const reset = useCallback(() => {
    setQuery("")
    setResults([])
    setSearching(false)
    clearTimeout(debounceRef.current)
  }, [])

  return {
    query,
    setQuery,
    results,
    searching,
    reset,
  }
}
