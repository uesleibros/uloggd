import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

export function useHeartbeat() {
  const { user } = useAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) return

    const ping = async (status) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      fetch("/api/users/@me/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      }).catch(() => {})
    }

    ping("online")

    intervalRef.current = setInterval(() => {
      ping(document.hidden ? "idle" : "online")
    }, 2 * 60 * 1000)

    const onVisibility = () => ping(document.hidden ? "idle" : "online")
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [user?.id])
}
