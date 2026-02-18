import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"

const GamesBatchContext = createContext(null)

export function GamesBatchProvider({ children }) {
  const [games, setGames] = useState({})
  const [loading, setLoading] = useState(true)
  const pendingSlugs = useRef(new Set())
  const loadedSlugs = useRef(new Set())
  const timer = useRef(null)
  const fetchId = useRef(0)

  const flush = useCallback(async () => {
    const newSlugs = [...pendingSlugs.current].filter(s => !loadedSlugs.current.has(s))
    pendingSlugs.current.clear()

    if (newSlugs.length === 0) {
      setLoading(false)
      return
    }

    const id = ++fetchId.current

    try {
      const res = await fetch("/api/igdb?action=gamesBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: newSlugs }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json()

      if (id === fetchId.current) {
        newSlugs.forEach(s => loadedSlugs.current.add(s))
        setGames(prev => ({ ...prev, ...data }))
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

  return (
    <GamesBatchContext.Provider value={{ games, loading, requestSlugs, getGame }}>
      {children}
    </GamesBatchContext.Provider>
  )
}

export function useGamesBatch(slugs = []) {
  const ctx = useContext(GamesBatchContext)

  if (!ctx) {
    const [games, setGames] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      if (slugs.length === 0) { setLoading(false); return }

      let active = true
      fetch("/api/igdb?action=gamesBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { if (active) { setGames(data); setLoading(false) } })
        .catch(() => { if (active) setLoading(false) })

      return () => { active = false }
    }, [slugs.join(",")])

    return { games, loading, getGame: (s) => games[s] || null }
  }

  useEffect(() => {
    if (slugs.length > 0) ctx.requestSlugs(slugs)
  }, [slugs.join(",")])

  return ctx
}