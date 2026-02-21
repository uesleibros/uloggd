import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"

const UserGamesContext = createContext(null)

export function UserGamesProvider({ children }) {
  const { user } = useAuth()
  const [games, setGames] = useState({})
  const [loaded, setLoaded] = useState(false)

  const fetchGames = useCallback(async () => {
    if (!user) {
      setGames({})
      setLoaded(true)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/userGames/@me/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setGames(data.games || {})
      }
    } catch {
    } finally {
      setLoaded(true)
    }
  }, [user])

  useEffect(() => { fetchGames() }, [fetchGames])

  const getGameData = useCallback((slug) => {
    return games[slug] || null
  }, [games])

  const getRating = useCallback((slug) => {
    return games[slug]?.avgRating || null
  }, [games])

  const refresh = useCallback(() => {
    setLoaded(false)
    fetchGames()
  }, [fetchGames])

  return (
    <UserGamesContext.Provider value={{ games, loaded, getGameData, getRating, refresh }}>
      {children}
    </UserGamesContext.Provider>
  )
}

export function useUserGames() {
  const ctx = useContext(UserGamesContext)
  
  if (!ctx) {
    return {
      games: {},
      loaded: true,
      getGameData: () => null,
      getRating: () => null,
      refresh: () => {},
    }
  }
  
  return ctx

}
