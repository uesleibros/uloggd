import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useCustomCovers } from "./useCustomCovers"

const GamesBatchContext = createContext(null)

export function GamesBatchProvider({ children, ownerId = null }) {
  const [games, setGames] = useState({})
  const [loading, setLoading] = useState(true)
  const [allSlugs, setAllSlugs] = useState([])
  const pendingSlugs = useRef(new Set())
  const loadedSlugs = useRef(new Set())
  const timer = useRef(null)
  const fetchId = useRef(0)

  const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, allSlugs)

  const flush = useCallback(async () => {
    const newSlugs = [...pendingSlugs.current].filter(s => !loadedSlugs.current.has(s))
    pendingSlugs.current.clear()

    if (newSlugs.length === 0) {
      setLoading(false)
      return
    }

    const id = ++fetchId.current

    try {
      const params = new URLSearchParams()
      newSlugs.forEach(slug => params.append("slugs", slug))

      const res = await fetch(`/api/igdb/gamesBatch?${params}`)

      if (!res.ok) throw new Error()
      const data = await res.json()

      if (id === fetchId.current) {
        newSlugs.forEach(s => loadedSlugs.current.add(s))
        setGames(prev => ({ ...prev, ...data }))
        setAllSlugs(prev => [...new Set([...prev, ...newSlugs])])
        setLoading(false)
      }
    } catch {
      if (id === fetchId.current) setLoading(false)
    }
  }, [])

  const requestSlugs = useCallback((slugs) => {
    let hasNew = false
    slugs.forEach(s => {
      if (!loadedSlugs.current.has(s)) {
        pendingSlugs.current.add(s)
        hasNew = true
      }
    })

    if (hasNew) {
      setLoading(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, 50)
    }
  }, [flush])

  const getGame = useCallback((slug) => games[slug] || null, [games])

  const isLoading = loading || coversLoading

  return (
    <GamesBatchContext.Provider value={{ games, loading: isLoading, requestSlugs, getGame, getCustomCover }}>
      {children}
    </GamesBatchContext.Provider>
  )
}

export function useGamesBatch(slugs = [], ownerId = null) {
  const ctx = useContext(GamesBatchContext)

  if (!ctx) {
    const [games, setGames] = useState({})
    const [loading, setLoading] = useState(true)

    const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, slugs)

    useEffect(() => {
      if (slugs.length === 0) { setLoading(false); return }

      let active = true
      
      const params = new URLSearchParams()
      slugs.forEach(slug => params.append("slugs", slug))

      fetch(`/api/igdb/gamesBatch?${params}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { if (active) { setGames(data); setLoading(false) } })
        .catch(() => { if (active) setLoading(false) })

      return () => { active = false }
    }, [slugs.join(",")])

    return { 
      games, 
      loading: loading || coversLoading, 
      getGame: (s) => games[s] || null,
      getCustomCover,
    }
  }

  useEffect(() => {
    if (slugs.length > 0) ctx.requestSlugs(slugs)
  }, [slugs.join(",")])

  return ctx
}
