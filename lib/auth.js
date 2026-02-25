import { supabase } from "#lib/supabase-ssr.js"

export async function getUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("user_id, username, is_moderator, is_banned")
    .eq("user_id", user.id)
    .single()

  if (!profile) return null

  return {
    id: profile.user_id,
    username: profile.username,
    is_moderator: profile.is_moderator,
    is_banned: profile.is_banned,
  }
}