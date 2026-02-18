import { supabase } from "../../../lib/supabase-ssr.js"
import { VALID_LIST_TYPES } from "../constants.js"

export async function handleFollowers(req, res) {
  const { userId, type } = req.body
  if (!userId || !type) return res.status(400).json({ error: "missing params" })
  if (!VALID_LIST_TYPES.includes(type)) return res.status(400).json({ error: "invalid type" })

  try {
    const isFollowers = type === "followers"
    const column = isFollowers ? "follower_id" : "following_id"
    const filterColumn = isFollowers ? "following_id" : "follower_id"

    const { data } = await supabase
      .from("follows")
      .select(column)
      .eq(filterColumn, userId)
      .order("created_at", { ascending: false })

    const userIds = data?.map(r => r[column]) || []
    if (userIds.length === 0) return res.json([])

    const [authRes, profilesRes, badgesRes] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from("users")
        .select("user_id, is_verified, is_moderator, avatar_decoration")
        .in("user_id", userIds),
      supabase
        .from("user_badges")
        .select("user_id, badge:badges ( id, title, description )")
        .in("user_id", userIds),
    ])

    const profileMap = {}
    profilesRes.data?.forEach(p => { profileMap[p.user_id] = p })

    const badgesMap = {}
    badgesRes.data?.forEach(ub => {
      if (!badgesMap[ub.user_id]) badgesMap[ub.user_id] = []
      if (ub.badge) badgesMap[ub.user_id].push(ub.badge)
    })

    const result = userIds
      .map(id => {
        const authUser = authRes.data?.users?.find(u => u.id === id)
        if (!authUser) return null
        const prof = profileMap[id]

        return {
          id: authUser.id,
          username: authUser.user_metadata?.full_name,
          avatar: authUser.user_metadata?.avatar_url,
          is_verified: prof?.is_verified || false,
          is_moderator: prof?.is_moderator || false,
          avatar_decoration: prof?.avatar_decoration || null,
          badges: badgesMap[id] || [],
        }
      })
      .filter(Boolean)

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
