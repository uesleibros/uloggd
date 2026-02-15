import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId, type } = req.body
  if (!userId || !type) return res.status(400).json({ error: "missing params" })

  try {
    let userIds = []

    if (type === "followers") {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .order("created_at", { ascending: false })

      userIds = data?.map(r => r.follower_id) || []
    } else if (type === "following") {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false })

      userIds = data?.map(r => r.following_id) || []
    } else {
      return res.status(400).json({ error: "invalid type" })
    }

    if (userIds.length === 0) return res.json([])

    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })

    const { data: profiles } = await supabase
      .from("users")
      .select("user_id, is_verified, is_moderator")
      .in("user_id", userIds)

    const profileMap = {}
    profiles?.forEach(p => { profileMap[p.user_id] = p })

    const result = userIds
      .map(id => {
        const authUser = users?.find(u => u.id === id)
        if (!authUser) return null
        const prof = profileMap[id]
        return {
          id: authUser.id,
          username: authUser.user_metadata?.full_name,
          avatar: authUser.user_metadata?.avatar_url,
          is_verified: prof?.is_verified || false,
          is_moderator: prof?.is_moderator || false,
        }
      })
      .filter(Boolean)

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}