import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"

export function useLike({ type, targetId }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!targetId) return

    const params = new URLSearchParams({
      type,
      targetId: String(targetId),
      ...(user?.id && { currentUserId: user.id })
    })

    fetch(`/api/likes/status?${params}`)
      .then(r => r.json())
      .then(data => {
        setCount(data.count || 0)
        setIsLiked(data.isLiked || false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type, targetId, user?.id])

  const toggle = useCallback(async () => {
    if (!user) return

    const action = isLiked ? "unlike" : "like"

    setIsLiked(!isLiked)
    setCount(prev => isLiked ? prev - 1 : prev + 1)

    try {
      const r = await fetch("/api/likes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, action })
      })

      if (!r.ok) {
        setIsLiked(isLiked)
        setCount(prev => isLiked ? prev + 1 : prev - 1)
      }
    } catch {
      setIsLiked(isLiked)
      setCount(prev => isLiked ? prev + 1 : prev - 1)
    }
  }, [type, targetId, isLiked, user])

  return { count, isLiked, loading, toggle }
}