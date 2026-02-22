import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth, updateUser } from "#hooks/useAuth"

export function useHeartbeat() {
  const { user, loading } = useAuth()
  const intervalRef = useRef(null)
  const tokenRef = useRef(null)
  const lastStatusRef = useRef(null)

  useEffect(() => {
    if (loading) return
    if (!user?.id) return

    const ping = async (status) => {
      if (lastStatusRef.current === status) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      tokenRef.current = session.access_token

      const res = await fetch("/api/users/@me/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      }).catch(() => null)

      if (res?.ok) {
        lastStatusRef.current = status
        updateUser({ status, last_seen: new Date().toISOString() })
      }
    }

    const onUnload = () => {
      if (!tokenRef.current) return

      navigator.sendBeacon(
        "/api/users/@me/heartbeat",
        new Blob(
          [JSON.stringify({ status: "offline", _authToken: tokenRef.current })],
          { type: "application/json" }
        )
      )
    }

    const onVisibility = () => ping(document.hidden ? "idle" : "online")

    ping("online")

    intervalRef.current = setInterval(() => {
      lastStatusRef.current = null
      ping(document.hidden ? "idle" : "online")
    }, 2 * 60 * 1000)

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("beforeunload", onUnload)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("beforeunload", onUnload)
      lastStatusRef.current = null
    }
  }, [user?.id, loading])
}
