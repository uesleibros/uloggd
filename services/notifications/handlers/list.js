import { supabase } from "#lib/supabase-ssr.js"

export async function handleNotificationList(req, res) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
