import { supabase } from "../../../lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "../constants.js"

export async function handleProfile(req, res) {
  const { userId, username } = req.body
  if (!userId && !username) return res.status(400).json({ error: "missing userId or username" })

  try {
    let authUser = null

    if (userId) {
      const { data } = await supabase.auth.admin.getUserById(userId)
      authUser = data?.user
    } else {
      const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      authUser = data?.users?.find(
        u => u.user_metadata?.full_name?.toLowerCase() === username.toLowerCase()
      )
    }

    if (!authUser) return res.status(404).json({ error: "user not found" })

    const { data: profile } = await supabase
      .from("users")
      .select(`
        banner, bio, thinking, avatar, avatar_decoration, created_at, is_moderator,
        user_badges ( badge:badges ( id, title, description ) )
      `)
      .eq("user_id", authUser.id)
      .single()

    const badges = profile?.user_badges?.map(ub => ub.badge) || []

    res.json({
      id: authUser.id,
      username: authUser.user_metadata?.full_name,
      avatar: profile?.avatar || DEFAULT_AVATAR_URL,
      discord_id: authUser.user_metadata?.provider_id,
      banner: profile?.banner,
      bio: profile?.bio,
      avatar_decoration: profile?.avatar_decoration,
      thinking: profile?.thinking,
      is_moderator: profile?.is_moderator,
      created_at: profile?.created_at,
      badges,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }

}




