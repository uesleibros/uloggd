import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useAuth } from "#hooks/useAuth"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const fetchIdRef = useRef(0)

  const normalizedUsername = username?.toLowerCase()

  const isOwnProfile = useMemo(() => {
    if (authLoading || !currentUser?.id || !currentUser?.username) return false
    return currentUser.username.toLowerCase() === normalizedUsername
  }, [authLoading, currentUser?.id, currentUser?.username, normalizedUsername])

  const profile = useMemo(() => {
    if (authLoading) return null
    if (isOwnProfile && currentUser?.id) return currentUser
    return fetchedProfile
  }, [isOwnProfile, currentUser, fetchedProfile, authLoading])

  useEffect(() => {
    const id = ++fetchIdRef.current

    setFetchedProfile(null)
    setError(null)
    setFetching(true)

    if (!username) {
      setFetching(false)
      return
    }

    if (authLoading) return

    if (
      currentUser?.id &&
      currentUser?.username &&
      currentUser.username.toLowerCase() === normalizedUsername
    ) {
      setFetching(false)
      return
    }

    const controller = new AbortController()

    fetch("/api/users/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        if (fetchIdRef.current !== id) return
        setFetchedProfile(data)
        setError(null)
        setFetching(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        if (fetchIdRef.current !== id) return
        setError(true)
        setFetching(false)
      })

    return () => {
      fetchIdRef.current++
      controller.abort()
    }
  }, [username, normalizedUsername, authLoading, currentUser?.id, currentUser?.username])

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
