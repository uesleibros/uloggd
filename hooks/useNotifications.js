import { useState, useEffect, useCallback } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

const POLL_INTERVAL = 10000

export function useNotifications() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!user) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const r = await fetch("/api/notifications/@me/count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await r.json()
      setUnreadCount(data.count || 0)
    } catch {}
  }, [user])

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }

    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user, fetchCount])

  return { unreadCount, refetch: fetchCount }
}
