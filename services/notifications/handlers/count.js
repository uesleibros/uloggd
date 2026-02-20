import { supabase } from "#lib/supabase-ssr.js"
import { getUser } from "#utils/auth.js"

export async function handleNotificationCount(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)

    if (error) throw error
    res.json({ count: count || 0 })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
