import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useAuth } from "#hooks/useAuth"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)

  const isOwnProfile = useMemo(() => {
    if (authLoading) return false
    if (!currentUser?.id || !currentUser?.username) return false
    return currentUser.username.toLowerCase() === username?.toLowerCase()
  }, [authLoading, currentUser?.id, currentUser?.username, username])

  const profile = useMemo(() => {
    if (isOwnProfile && currentUser?.id) return currentUser
    if (fetchedProfile?.id) return fetchedProfile
    return null
  }, [isOwnProfile, currentUser, fetchedProfile])

  // Reset quando username muda
  useEffect(() => {
    setFetchedProfile(null)
    setError(null)
    setFetching(true)
  }, [username])

  // Fetch principal - SÓ roda depois que auth terminou de carregar
  useEffect(() => {
    if (!username) return
    if (authLoading) return // <-- ESPERA o auth resolver primeiro

    if (isOwnProfile) {
      setFetching(false)
      return
    }

    const controller = new AbortController()

    setFetching(true)

    fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Profile not found")
        return res.json()
      })
      .then((data) => {
        setFetchedProfile(data)
        setError(null)
        setFetching(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(true)
        setFetching(false)
      })

    return () => controller.abort()
  }, [username, authLoading, isOwnProfile])

  const updateProfile = useCallback(
    (partial) => {
      if (isOwnProfile) return
      setFetchedProfile((prev) => (prev ? { ...prev, ...partial } : prev))
    },
    [isOwnProfile]
  )

  return {
    profile,
    isOwnProfile,
    currentUser,
    authLoading,
    fetching,
    error,
    updateProfile,
  }
}
