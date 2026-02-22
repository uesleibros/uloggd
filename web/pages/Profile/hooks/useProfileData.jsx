import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)
  const lastFetchedUsername = useRef(null)

  const isOwnProfile = !authLoading && currentUser?.username?.toLowerCase() === username?.toLowerCase()

  const profile = useMemo(() => {
    if (isOwnProfile && currentUser) return currentUser
    return fetchedProfile
  }, [isOwnProfile, currentUser, fetchedProfile])

  useEffect(() => {
    setFetchedProfile(null)
    setError(null)
    lastFetchedUsername.current = null
  }, [username])

  useEffect(() => {
    if (authLoading) return
    if (isOwnProfile) return
    if (lastFetchedUsername.current === username) return

    lastFetchedUsername.current = username
    setFetching(true)
    setError(null)

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
        if (err.name !== "AbortError") {
          setError(true)
          setFetching(false)
        }
      })

    return () => controller.abort()
  }, [username, authLoading, isOwnProfile])

  function updateProfile(partial) {
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
