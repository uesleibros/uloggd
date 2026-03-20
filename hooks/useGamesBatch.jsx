import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useCustomCovers } from "./useCustomCovers"

const GamesBatchContext = createContext(null)

const globalBatcher = {
  games: {},
  pendingSlugs: new Set(),
  loadedSlugs: new Set(),
  listeners: new Set(),
  timer: null,
  fetching: false,
  
  notify() {
    this.listeners.forEach(fn => fn({ ...this.games }))
  },
  
  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  },
  
  getGame(slug) {
    return this.games[slug] || null
  },
  
  isLoaded(slug) {
    return this.loadedSlugs.has(slug)
  },
  
  request(slugs) {
    let hasNew = false
    
    slugs.forEach(slug => {
      if (slug && !this.loadedSlugs.has(slug) && !this.pendingSlugs.has(slug)) {
        this.pendingSlugs.add(slug)
        hasNew = true
      }
    })
    
    if (hasNew) {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.flush(), 50)
    }
  },
  
  async flush() {
    if (this.fetching || this.pendingSlugs.size === 0) return
    
    this.fetching = true
    const slugsToFetch = [...this.pendingSlugs]
    this.pendingSlugs.clear()
    
    try {
      const chunks = []
      for (let i = 0; i < slugsToFetch.length; i += 50) {
        chunks.push(slugsToFetch.slice(i, i + 50))
      }
      
      for (const chunk of chunks) {
        const params = new URLSearchParams()
        chunk.forEach(slug => params.append("slugs", slug))
        
        const res = await fetch(`/api/igdb/gamesBatch?${params}`)
        
        if (res.ok) {
          const data = await res.json()
          chunk.forEach(slug => this.loadedSlugs.add(slug))
          this.games = { ...this.games, ...data }
          this.notify()
        } else {
          chunk.forEach(slug => this.loadedSlugs.add(slug))
        }
      }
    } catch {
      slugsToFetch.forEach(slug => this.loadedSlugs.add(slug))
    } finally {
      this.fetching = false
      
      if (this.pendingSlugs.size > 0) {
        this.timer = setTimeout(() => this.flush(), 50)
      }
    }
  }
}

export function GamesBatchProvider({ children, ownerId = null }) {
  const [games, setGames] = useState(() => ({ ...globalBatcher.games }))
  const [allSlugs, setAllSlugs] = useState([])

  const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, allSlugs)

  useEffect(() => {
    return globalBatcher.subscribe((newGames) => {
      setGames(newGames)
      setAllSlugs(Object.keys(newGames))
    })
  }, [])

  const requestSlugs = useCallback((slugs) => {
    globalBatcher.request(slugs)
  }, [])

  const getGame = useCallback((slug) => {
    return globalBatcher.getGame(slug)
  }, [games])

  const loading = globalBatcher.fetching || globalBatcher.pendingSlugs.size > 0 || coversLoading

  return (
    <GamesBatchContext.Provider value={{ games, loading, requestSlugs, getGame, getCustomCover }}>
      {children}
    </GamesBatchContext.Provider>
  )
}

export function useGamesBatch(slugs = [], ownerId = null) {
  const ctx = useContext(GamesBatchContext)
  const [games, setGames] = useState(() => {
    const initial = {}
    slugs.forEach(slug => {
      const game = globalBatcher.getGame(slug)
      if (game) initial[slug] = game
    })
    return initial
  })
  const [loading, setLoading] = useState(() => {
    return slugs.length > 0 && slugs.some(slug => !globalBatcher.isLoaded(slug))
  })

  const { getCustomCover, loading: coversLoading } = useCustomCovers(ownerId, slugs)

  useEffect(() => {
    if (slugs.length === 0) {
      setLoading(false)
      return
    }

    globalBatcher.request(slugs)

    const unsubscribe = globalBatcher.subscribe((allGames) => {
      const relevantGames = {}
      let allLoaded = true
      
      slugs.forEach(slug => {
        if (allGames[slug]) {
          relevantGames[slug] = allGames[slug]
        }
        if (!globalBatcher.isLoaded(slug)) {
          allLoaded = false
        }
      })
      
      setGames(relevantGames)
      setLoading(!allLoaded)
    })

    const allLoaded = slugs.every(slug => globalBatcher.isLoaded(slug))
    if (allLoaded) {
      const relevantGames = {}
      slugs.forEach(slug => {
        const game = globalBatcher.getGame(slug)
        if (game) relevantGames[slug] = game
      })
      setGames(relevantGames)
      setLoading(false)
    }

    return unsubscribe
  }, [slugs.join(",")])

  useEffect(() => {
    if (ctx && slugs.length > 0) {
      ctx.requestSlugs(slugs)
    }
  }, [ctx, slugs.join(",")])

  const getGame = useCallback((slug) => {
    return games[slug] || globalBatcher.getGame(slug) || null
  }, [games])

  return {
    games,
    loading: loading || coversLoading,
    getGame,
    getCustomCover,
  }
}

export function prefetchGames(slugs) {
  globalBatcher.request(slugs)
}