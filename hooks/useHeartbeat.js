import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

let activeHeartbeat = null

export function useHeartbeat() {
  const { user, loading } = useAuth()
  const intervalRef = useRef(null)
  const tokenRef = useRef(null)

  useEffect(() => {
    if (loading || !user?.id) return
    if (activeHeartbeat && activeHeartbeat !== user.id) return

    activeHeartbeat = user.id

    const ping = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      tokenRef.current = session.access_token

      await fetch("/api/users/@me/heartbeat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json", 
        },
        body: JSON.stringify({ status: "online" }),
      }).catch(() => null)
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

    ping()

    intervalRef.current = setInterval(ping, 2 * 60 * 1000)

    window.addEventListener("beforeunload", onUnload)

    return () => {
      clearInterval(intervalRef.current)
      window.removeEventListener("beforeunload", onUnload)
      activeHeartbeat = null
    }
  }, [user?.id, loading])
}