import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useAuth } from "#hooks/useAuth"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const lastUsernameRef = useRef(null)

  const normalizedUsername = username?.toLowerCase()

  const isOwnProfile = useMemo(() => {
    if (authLoading || !currentUser?.id || !currentUser?.username) return false
    return currentUser.username.toLowerCase() === normalizedUsername
  }, [authLoading, currentUser?.id, currentUser?.username, normalizedUsername])

  useEffect(() => {
    if (lastUsernameRef.current !== normalizedUsername) {
      setFetchedProfile(null)
      setError(null)
      lastUsernameRef.current = normalizedUsername
    }

    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    setFetching(true)

    if (!username) {
      setFetching(false)
      return
    }

    if (authLoading) return

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
  }, [username, normalizedUsername, authLoading])

  const profile = useMemo(() => {
    if (authLoading) return null
    return fetchedProfile
  }, [fetchedProfile, authLoading])

  const updateProfile = useCallback((partial) => {
    setFetchedProfile((prev) => (prev ? { ...prev, ...partial } : prev))
  }, [])

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