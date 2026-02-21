import { supabase } from "#lib/supabase-ssr.js"
import { MAX_THINKING } from "#services/users/constants.js"

export async function handleThinking(req, res) {
  const { thinking } = req.body

  if (thinking !== null && thinking !== undefined) {
    if (typeof thinking !== "string") return res.status(400).json({ error: "thinking must be a string" })
    if (thinking.length > MAX_THINKING) return res.status(400).json({ error: `thinking too long (max ${MAX_THINKING})` })
  }

  try {
    const value = thinking?.trim() || null

    const { error } = await supabase
      .from("users")
      .update({ thinking: value })
      .eq("user_id", req.user.id)

    if (error) throw error
    res.json({ thinking: value })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
