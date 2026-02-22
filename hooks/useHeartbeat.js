import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

const HEARTBEAT_INTERVAL = 2 * 60 * 1000
const DEBOUNCE_DELAY = 2000
const TOKEN_CACHE_TTL = 30000

export function useHeartbeat() {
  const { user } = useAuth()
  const intervalRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
  const tokenCacheRef = useRef({ token: null, promise: null })

  useEffect(() => {
    if (!user) return

    const getToken = async () => {
      const cache = tokenCacheRef.current
      if (cache.token) return cache.token

      if (!cache.promise) {
        cache.promise = supabase.auth.getSession().then(({ data: { session } }) => {
          cache.token = session?.access_token
          setTimeout(() => {
            cache.token = null
            cache.promise = null
          }, TOKEN_CACHE_TTL)
          return cache.token
        })
      }
      return cache.promise
    }

    const forcePing = async (status, useBeacon = false) => {
      const token = await getToken()
      if (!token) return

      if (useBeacon) {
        const blob = new Blob(
          [JSON.stringify({ status, _authToken: token })],
          { type: "application/json" }
        )
        navigator.sendBeacon("/api/users/@me/heartbeat", blob)
        return
      }

      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      fetch("/api/users/@me/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
        signal: abortRef.current.signal,
      }).catch(() => {})
    }

    const handleVisibility = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        forcePing(document.hidden ? "idle" : "online")
      }, DEBOUNCE_DELAY)
    }

    const handleUnload = () => {
      forcePing("offline", true)
    }

    debounceRef.current = setTimeout(() => forcePing("online"), DEBOUNCE_DELAY)

    intervalRef.current = setInterval(() => {
      forcePing(document.hidden ? "idle" : "online")
    }, HEARTBEAT_INTERVAL)

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("beforeunload", handleUnload)

    return () => {
      if (abortRef.current) abortRef.current.abort()
      clearInterval(intervalRef.current)
      clearTimeout(debounceRef.current)
      tokenCacheRef.current = { token: null, promise: null }
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [user?.id])
}
