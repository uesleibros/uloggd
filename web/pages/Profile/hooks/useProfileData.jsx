import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useAuth } from "#hooks/useAuth"

const profileCache = new Map()

export function useProfileData(username) {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const normalizedUsername = username?.toLowerCase()

  const isOwnProfile = useMemo(() => {
    if (authLoading || !currentUser?.username || !normalizedUsername) return false
    return currentUser.username.toLowerCase() === normalizedUsername
  }, [authLoading, currentUser?.username, normalizedUsername])

  useEffect(() => {
    if (!username || authLoading) {
      setFetching(true)
      return
    }

    if (isOwnProfile && currentUser) {
      setFetchedProfile(currentUser)
      setFetching(false)
      return
    }

    if (profileCache.has(normalizedUsername)) {
      setFetchedProfile(profileCache.get(normalizedUsername))
      setFetching(false)
      return
    }

    setFetching(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    fetch(`/api/users/profile?username=${encodeURIComponent(username)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        if (controller.signal.aborted) return
        profileCache.set(normalizedUsername, data)
        setFetchedProfile(data)
        setFetching(false)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        setError(true)
        setFetching(false)
      })

    return () => {
      controller.abort()
    }
  }, [username, normalizedUsername, authLoading, isOwnProfile, currentUser])

  const profile = useMemo(() => {
    if (authLoading) return null
    return fetchedProfile
  }, [fetchedProfile, authLoading])

  const updateProfile = useCallback((partial) => {
    setFetchedProfile((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...partial }
      if (!isOwnProfile) {
        profileCache.set(normalizedUsername, updated)
      }
      return updated
    })
  }, [normalizedUsername, isOwnProfile])

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
