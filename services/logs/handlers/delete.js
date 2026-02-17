import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"

export async function handleDelete(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { logId } = req.body
  if (!logId) return res.status(400).json({ error: "logId required" })

  try {
    const { error } = await supabase
      .from("logs")
      .delete()
      .eq("id", logId)
      .eq("user_id", user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to delete log" })
  }
}