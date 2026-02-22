import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "#hooks/useAuth"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const lastFetchedUsername = useRef(null)

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

  useEffect(() => {
    setFetchedProfile(null)
    setError(null)
    setFetching(true)
    lastFetchedUsername.current = null
  }, [username])

  useEffect(() => {
    if (!username) return
    
    if (isOwnProfile) {
      setFetching(false)
      return
    }

    if (lastFetchedUsername.current === username) return
    lastFetchedUsername.current = username

    const controller = new AbortController()
    
    fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        setFetchedProfile(data)
        setFetching(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(true)
        setFetching(false)
      })

    return () => controller.abort()
  }, [username, isOwnProfile])

  function updateProfile(partial) {
    if (isOwnProfile) return
    setFetchedProfile((prev) => (prev ? { ...prev, ...partial } : prev))
  }

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
