import { useEffect } from "react"
import { useAuth } from "#hooks/useAuth"

export default function OAuthSync() {
  const { refreshUser } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get("connected") === "twitch") {
      refreshUser()
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  return null
}
