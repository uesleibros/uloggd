import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "#hooks/useAuth"

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const hasFetchedRef = useRef(false)
  const lastUsernameRef = useRef(null)

  const normalizedUsername = username?.toLowerCase()

  const isOwnProfile =
    !authLoading &&
    !!currentUser?.username &&
    !!normalizedUsername &&
    currentUser.username.toLowerCase() === normalizedUsername

  useEffect(() => {
    if (!username || authLoading) {
      setFetching(true)
      setError(null)
      setFetchedProfile(null)
      hasFetchedRef.current = false
      return
    }

    if (isOwnProfile) {
      setFetchedProfile(currentUser)
      setFetching(false)
      setError(null)
      hasFetchedRef.current = false
      return
    }

    if (hasFetchedRef.current && lastUsernameRef.current === normalizedUsername) {
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setFetching(true)
    setError(null)
    setFetchedProfile(null)

    fetch(`/api/users/profile?username=${encodeURIComponent(username)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        setFetchedProfile(data)
        setFetching(false)
        hasFetchedRef.current = true
        lastUsernameRef.current = normalizedUsername
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(true)
        setFetching(false)
      })

    return () => controller.abort()
  }, [normalizedUsername, authLoading, isOwnProfile, currentUser])

  const profile = authLoading ? null : fetchedProfile

  const updateProfile = useCallback((partial) => {
    setFetchedProfile((prev) => {
      if (!prev) return prev
      return { ...prev, ...partial }
    })
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
