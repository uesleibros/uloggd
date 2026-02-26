import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "#lib/supabase"

export function useFollowData(profile, currentUser, authLoading, isOwnProfile) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followsYou, setFollowsYou] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const abortRef = useRef(null)

  useEffect(() => {
    if (!profile?.id || authLoading) return

    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    fetch("/api/users/followStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        currentUserId: currentUser?.id || null
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((s) => {
        if (controller.signal.aborted) return

        setFollowersCount(s.followers)
        setFollowingCount(s.following)

        if (!isOwnProfile) {
          setIsFollowing(s.isFollowing)
          setFollowsYou(s.followsYou)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [profile?.id, currentUser?.id, authLoading, isOwnProfile])

  const handleFollow = useCallback(async () => {
    if (!currentUser || !profile || followLoading) return

    setFollowLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          followingId: profile.id,
          action: isFollowing ? "unfollow" : "follow",
        }),
      })

      const data = await res.json()

      if (!res.ok) return

      setIsFollowing(data.followed)

      setFollowersCount((prev) =>
        data.followed ? prev + 1 : Math.max(0, prev - 1)
      )

    } catch {
    } finally {
      setFollowLoading(false)
    }
  }, [currentUser, profile, isFollowing, followLoading])

  return {
    isFollowing,
    followLoading,
    followsYou,
    followersCount,
    followingCount,
    handleFollow,
  }
}