import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"

export async function handleNotificationRead(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { notificationId } = req.body

  try {
    if (notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)

      if (error) throw error
    }

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
