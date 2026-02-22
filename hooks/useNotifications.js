import { useState, useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

const POLL_INTERVAL = 30000

export function useNotifications() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const tokenRef = useRef(null)

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }

    const getToken = async () => {
      if (!tokenRef.current) {
        const { data: { session } } = await supabase.auth.getSession()
        tokenRef.current = session?.access_token
        setTimeout(() => { tokenRef.current = null }, 30000)
      }
      return tokenRef.current
    }

    const fetchCount = async () => {
      if (document.hidden) return

      const token = await getToken()
      if (!token) return

      try {
        const r = await fetch("/api/notifications/@me/count", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await r.json()
        setUnreadCount(data.count || 0)
      } catch {}
    }

    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL)

    const handleVisibility = () => {
      if (!document.hidden) fetchCount()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [user?.id])

  const refetch = async () => {
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
  }

  return { unreadCount, refetch }
}