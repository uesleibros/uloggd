import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "unauthorized" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "unauthorized" })

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
