import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"

const VALID_LIKE_ACTIONS = ["like", "unlike"]

export async function handleLike(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { logId, action } = req.body

  if (!logId) return res.status(400).json({ error: "missing logId" })
  if (!VALID_LIKE_ACTIONS.includes(action)) return res.status(400).json({ error: "invalid action" })

  try {
    if (action === "like") {
      const { error } = await supabase
        .from("log_likes")
        .upsert(
          { user_id: user.id, log_id: logId },
          { onConflict: "user_id,log_id" }
        )

      if (error) throw error
      return res.json({ liked: true })
    }

    const { error } = await supabase
      .from("log_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("log_id", logId)

    if (error) throw error
    res.json({ liked: false })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
