import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId, username } = req.body
  if (!userId && !username) return res.status(400).json({ error: "missing userId or username" })

  try {
    let authUser = null

    if (userId) {
      const { data } = await supabase.auth.admin.getUserById(userId)
      authUser = data?.user
    } else if (username) {
      const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      authUser = data?.users?.find(
        u => u.user_metadata?.full_name?.toLowerCase() === username.toLowerCase()
      )
    }

    if (!authUser) return res.status(404).json({ error: "user not found" })

    const { data: profile } = await supabase
      .from("users")
      .select("is_verified, is_moderator, is_trainee_moderator, banner, bio, created_at")
      .eq("user_id", authUser.id)
      .single()

    res.json({
      id: authUser.id,
      username: authUser.user_metadata?.full_name,
      avatar: authUser.user_metadata?.avatar_url,
      discord_id: authUser.user_metadata?.provider_id,
      ...profile
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }

}
