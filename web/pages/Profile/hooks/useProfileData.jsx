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

  const isOwnProfile = !authLoading
    && !!currentUser?.username
    && !!normalizedUsername
    && currentUser.username.toLowerCase() === normalizedUsername

  useEffect(() => {
    if (!username || authLoading) {
      setFetching(true)
      setError(null)
      setFetchedProfile(null)
      return
    }

    if (isOwnProfile) {
      setFetchedProfile(currentUser)
      setFetching(false)
      setError(null)
      return
    }

    const cached = profileCache.get(normalizedUsername)
    if (cached) {
      setFetchedProfile(cached)
      setFetching(false)
      setError(null)
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
        profileCache.set(normalizedUsername, data)
        setFetchedProfile(data)
        setFetching(false)
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
      const updated = { ...prev, ...partial }
      if (!isOwnProfile) {
        profileCache.set(normalizedUsername, updated)
      }
      return updated
    })
  }, [normalizedUsername, isOwnProfile])

  const invalidateCache = useCallback((user) => {
    if (user) {
      profileCache.delete(user.toLowerCase())
    } else {
      profileCache.delete(normalizedUsername)
    }
  }, [normalizedUsername])

  return {
    profile,
    isOwnProfile,
    currentUser,
    authLoading,
    fetching,
    error,
    updateProfile,
    invalidateCache,
  }
}
