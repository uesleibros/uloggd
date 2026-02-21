import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleBatch(req, res) {
  const { userIds } = req.body

  if (!userIds?.length) return res.json([])

  try {
    const [authRes, profilesRes, badgesRes] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 1000 }),
      supabase
        .from("users")
        .select("user_id, avatar, is_moderator, avatar_decoration")
        .in("user_id", userIds),
      supabase
        .from("user_badges")
        .select("user_id, assigned_at, badge:badges ( id, title, description, icon_url, color )")
        .in("user_id", userIds),
    ])

    const profileMap = {}
    profilesRes.data?.forEach(p => { profileMap[p.user_id] = p })

    const badgesMap = {}
    badgesRes.data?.forEach(ub => {
      if (!badgesMap[ub.user_id]) badgesMap[ub.user_id] = []
      if (ub.badge) {
        badgesMap[ub.user_id].push({
          ...ub.badge,
          assigned_at: ub.assigned_at,
        })
      }
    })

    const result = userIds
      .map(id => {
        const authUser = authRes.data?.users?.find(u => u.id === id)
        if (!authUser) return null
        const prof = profileMap[id]

        return {
          id: authUser.id,
          username: authUser.user_metadata?.full_name,
          avatar: prof?.avatar || DEFAULT_AVATAR_URL,
          is_moderator: prof?.is_moderator,
          avatar_decoration: prof?.avatar_decoration,
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
