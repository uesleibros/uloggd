import { useState, useEffect, useRef } from "react"

const cache = new Map()

export function useCustomCovers(userId, slugs = []) {
  const [covers, setCovers] = useState({})
  const [loading, setLoading] = useState(false)
  const prevKey = useRef("")

  useEffect(() => {
    if (!userId || slugs.length === 0) {
      setCovers({})
      return
    }

    const sortedSlugs = [...slugs].sort()
    const key = `${userId}:${sortedSlugs.join(",")}`

    if (key === prevKey.current) return
    prevKey.current = key

    if (cache.has(key)) {
      setCovers(cache.get(key))
      return
    }

    const controller = new AbortController()
    setLoading(true)

    const params = new URLSearchParams({ userId })
    slugs.forEach(s => params.append("slugs", s))

    fetch(`/api/userGames/customCovers?${params}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        cache.set(key, data.covers || {})
        setCovers(data.covers || {})
      })
      .catch(e => {
        if (e.name !== "AbortError") {
          console.error(e)
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [userId, slugs.join(",")])

  const getCustomCover = (slug) => covers[slug] || null

  return { covers, loading, getCustomCover }
}
