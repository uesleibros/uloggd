import { supabase } from "#lib/supabase-ssr.js"

export async function handleNotificationCount(req, res) {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .eq("read", false)

    if (error) throw error
    res.json({ count: count || 0 })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
