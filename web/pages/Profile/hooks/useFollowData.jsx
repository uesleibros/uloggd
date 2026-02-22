import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase"

export function useFollowData(profile, currentUser, authLoading, isOwnProfile) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followsYou, setFollowsYou] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    if (!profile?.id || authLoading) return

    const controller = new AbortController()

    fetch("/api/users/followStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, currentUserId: currentUser?.id || null }),
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((s) => {
        setFollowersCount(s.followers)
        setFollowingCount(s.following)
        if (!isOwnProfile) {
          setIsFollowing(s.isFollowing)
          setFollowsYou(s.followsYou)
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[useFollowData] error:", err)
        }
      })

    return () => controller.abort()
  }, [profile?.id, currentUser?.id, authLoading, isOwnProfile])

  async function handleFollow() {
    if (!currentUser || !profile) return
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
      setIsFollowing(data.followed)
      setFollowersCount((prev) => (data.followed ? prev + 1 : prev - 1))
    } catch {
    } finally {
      setFollowLoading(false)
    }
  }

  return {
    isFollowing,
    followLoading,
    followsYou,
    followersCount,
    followingCount,
    handleFollow,
  }
}
