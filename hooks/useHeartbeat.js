import { useEffect, useRef } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

export function useHeartbeat() {
  const { user, refreshUser } = useAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) return

    const ping = async (status = "online") => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch("/api/users/@me/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      })
    }

    const handleVisibility = async () => {
      const status = document.hidden ? "idle" : "online"
      await ping(status)
      if (!document.hidden) {
        refreshUser()
      }
    }

    ping("online")
    intervalRef.current = setInterval(() => {
      ping(document.hidden ? "idle" : "online")
    }, 2 * 60 * 1000)

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [user?.id])
}