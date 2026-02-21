import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

const PROFILE_SELECT = `
  banner, bio, pronoun, thinking, avatar, avatar_decoration, created_at, is_moderator,
  user_badges ( assigned_at, badge:badges ( id, title, description, icon_url, color ) )
`

async function getAuthUser(userId) {
  const { data } = await supabase.auth.admin.getUserById(userId)
  return data?.user
}

async function getAuthUserByUsername(username) {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  return data?.users?.find(
    u => u.user_metadata?.full_name?.toLowerCase() === username.toLowerCase()
  )
}

function formatProfile(authUser, profile) {
  const badges = profile?.user_badges?.map(ub => ({
    ...ub.badge,
    assigned_at: ub.assigned_at,
  })) || []

  return {
    id: authUser.id,
    username: authUser.user_metadata?.full_name,
    avatar: profile?.avatar || DEFAULT_AVATAR_URL,
    discord_id: authUser.user_metadata?.provider_id,
    banner: profile?.banner,
    bio: profile?.bio,
    avatar_decoration: profile?.avatar_decoration,
    thinking: profile?.thinking,
    pronoun: profile?.pronoun,
    is_moderator: profile?.is_moderator,
    created_at: profile?.created_at,
    badges,
  }
}

export async function handleProfile(req, res) {
  const { userId, username } = req.body
  if (!userId && !username) return res.status(400).json({ error: "missing userId or username" })

  try {
    const authUser = userId
      ? await getAuthUser(userId)
      : await getAuthUserByUsername(username)

    if (!authUser) return res.status(404).json({ error: "user not found" })

    const { data: profile } = await supabase
      .from("users")
      .select(PROFILE_SELECT)
      .eq("user_id", authUser.id)
      .single()

    res.json(formatProfile(authUser, profile))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
