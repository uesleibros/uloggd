import { useState, useEffect } from "react"

export function useUserLikesCount(userId) {
  const [counts, setCounts] = useState({ games: 0, reviews: 0, lists: 0, tierlists: 0, screenshots: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)

    fetch(`/api/likes/counts?userId=${userId}`)
      .then(r => r.ok ? r.json() : { total: 0 })
      .then(data => setCounts(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  return { counts, loading }
}