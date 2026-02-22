import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useAuth } from "#hooks/useAuth"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

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
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

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
    abortRef.current = controller

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
        if (controller.signal.aborted) return
        setFetchedProfile(data)
        setError(null)
        setFetching(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        if (controller.signal.aborted) return
        setError(true)
        setFetching(false)
      })

    return () => {
      controller.abort()
      abortRef.current = null
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
