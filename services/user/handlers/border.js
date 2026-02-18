import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"
import { VALID_BORDERS } from "../constants.js"

export async function handleBorder(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { border } = req.body

  if (!border || !VALID_BORDERS.includes(border))
    return res.status(400).json({ error: "invalid border" })

  try {
    const { error } = await supabase
      .from("users")
      .update({ avatar_border: border })
      .eq("user_id", user.id)

    if (error) throw error
    res.json({ avatar_border: border })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
