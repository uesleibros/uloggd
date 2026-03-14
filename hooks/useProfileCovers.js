import { useState, useEffect } from "react"

const cache = {}

export function useProfileCovers(userId) {
  const [covers, setCovers] = useState(userId && cache[userId] ? cache[userId] : {})
  const [loading, setLoading] = useState(!cache[userId])

  useEffect(() => {
    if (!userId) return
    if (cache[userId]) {
      setCovers(cache[userId])
      setLoading(false)
      return
    }

    setLoading(true)

    fetch(`/api/userGames/customCovers?userId=${userId}`)
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        cache[userId] = data
        setCovers(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const getCover = (slug) => covers[slug] || null

  return { covers, loading, getCover }
}
