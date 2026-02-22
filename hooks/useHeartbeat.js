import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

const HEARTBEAT_INTERVAL = 2 * 60 * 1000

export function useHeartbeat() {
  const { user } = useAuth()
  const intervalRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!user) return

    let tokenCache = null
    let tokenPromise = null

    const getToken = async () => {
      if (tokenCache) return tokenCache
      if (!tokenPromise) {
        tokenPromise = supabase.auth.getSession().then(({ data: { session } }) => {
          tokenCache = session?.access_token
          setTimeout(() => { tokenCache = null; tokenPromise = null }, 30000)
          return tokenCache
        })
      }
      return tokenPromise
    }

    const forcePing = async (status) => {
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
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        forcePing(document.hidden ? "idle" : "online")
      }, 500)
    }

    const handleUnload = () => {
      navigator.sendBeacon("/api/users/@me/heartbeat",
        JSON.stringify({ status: "offline" }))
    }

    forcePing("online")
    intervalRef.current = setInterval(() => {
      forcePing(document.hidden ? "idle" : "online")
    }, HEARTBEAT_INTERVAL)

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("beforeunload", handleUnload)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(debounceRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [user?.id])
}