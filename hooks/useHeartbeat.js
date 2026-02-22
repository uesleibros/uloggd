import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

const HEARTBEAT_INTERVAL = 2 * 60 * 1000

export function useHeartbeat() {
  const { user } = useAuth()
  const intervalRef = useRef(null)
  const lastStatus = useRef(null)

  useEffect(() => {
    if (!user) return

    let tokenCache = null

    const getToken = async () => {
      if (!tokenCache) {
        const { data: { session } } = await supabase.auth.getSession()
        tokenCache = session?.access_token
        setTimeout(() => { tokenCache = null }, 30000)
      }
      return tokenCache
    }

    const forcePing = async (status) => {
      lastStatus.current = status
      const token = await getToken()
      if (!token) return

      fetch("/api/users/@me/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }).catch(() => {})
    }

    const handleVisibility = () => {
      forcePing(document.hidden ? "idle" : "online")
    }

    forcePing("online")
    intervalRef.current = setInterval(() => {
      forcePing(document.hidden ? "idle" : "online")
    }, HEARTBEAT_INTERVAL)

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [user?.id])
}