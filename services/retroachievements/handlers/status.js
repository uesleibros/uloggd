import { supabase } from "#lib/supabase-ssr.js"

export async function handleStatus(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const { data, error } = await supabase
      .from("user_connections")
      .select("provider_user_id, provider_username, provider_display_name, provider_avatar_url, extra_data")
      .eq("user_id", userId)
      .eq("provider", "retroachievements")
      .maybeSingle()

    if (error) throw error

    if (data) {
      res.json({
        connected: true,
        userId: data.provider_user_id,
        username: data.provider_display_name,
        avatar: data.provider_avatar_url,
        points: data.extra_data?.points || 0,
        rank: data.extra_data?.rank || null,
        memberSince: data.extra_data?.memberSince || null,
      })
    } else {
      res.json({ connected: false })
    }
  } catch (err) {
    console.error("RA status error:", err)
    res.json({ connected: false })
  }
}
