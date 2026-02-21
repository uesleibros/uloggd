import { supabase } from "#lib/supabase-ssr.js"

export async function handleNotificationDelete(req, res) {
  const { notificationId } = req.body

  try {
    let query = supabase
      .from("notifications")
      .delete()
      .eq("user_id", req.user.id)

    if (notificationId) query = query.eq("id", notificationId)

    const { error } = await query
    if (error) throw error

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
