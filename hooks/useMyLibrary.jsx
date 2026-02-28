import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"

const MyLibraryContext = createContext(null)

export function MyLibraryProvider({ children }) {
  const { user } = useAuth()
  const [games, setGames] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const refreshTimeoutRef = useRef(null)
  const abortControllerRef = useRef(null)

  const fetchGames = useCallback(async (signal) => {
    if (!user) {
      setGames({})
      setLoaded(true)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || signal?.aborted) return

      const res = await fetch("/api/userGames/@me/library", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        signal,
      })

      if (res.ok && !signal?.aborted) {
        const data = await res.json()
        setGames(data.games || {})
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Failed to fetch library:", e)
      }
    } finally {
      if (!signal?.aborted) {
        setLoaded(true)
        setRefreshing(false)
      }
    }
  }, [user])

  useEffect(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    fetchGames(abortControllerRef.current.signal)

    return () => {
      abortControllerRef.current?.abort()
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [fetchGames])

  const getGameData = useCallback((slug) => {
    return games[slug] || null
  }, [games])

  const getRating = useCallback((slug) => {
    return games[slug]?.avgRating || null
  }, [games])

  const refresh = useCallback((options = {}) => {
    const { delay = 400, optimistic = null } = options

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    if (optimistic) {
      setGames(prev => ({
        ...prev,
        [optimistic.slug]: {
          ...prev[optimistic.slug],
          ...optimistic.data,
        },
      }))
    }

    setRefreshing(true)

    refreshTimeoutRef.current = setTimeout(() => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()
      fetchGames(abortControllerRef.current.signal)
    }, delay)
  }, [fetchGames])

  const updateGame = useCallback((slug, data) => {
    setGames(prev => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        ...data,
      },
    }))
  }, [])

  const removeGame = useCallback((slug) => {
    setGames(prev => {
      const next = { ...prev }
      delete next[slug]
      return next
    })
  }, [])

  return (
    <MyLibraryContext.Provider value={{
      games,
      loaded,
      refreshing,
      getGameData,
      getRating,
      refresh,
      updateGame,
      removeGame,
    }}>
      {children}
    </MyLibraryContext.Provider>
  )
}

export function useMyLibrary() {
  const ctx = useContext(MyLibraryContext)

  if (!ctx) {
    return {
      games: {},
      loaded: true,
      refreshing: false,
      getGameData: () => null,
      getRating: () => null,
      refresh: () => {},
      updateGame: () => {},
      removeGame: () => {},
    }
  }

  return ctx
}
