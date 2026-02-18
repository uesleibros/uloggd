import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"
import decorationsData from "../../../data/avatarDecorations.json" assert { type: "json" }

const VALID_DECORATIONS = decorationsData.map(d => d.id)

export async function handleDecoration(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { decoration } = req.body

  if (decoration && !VALID_DECORATIONS.includes(decoration))
    return res.status(400).json({ error: "invalid decoration" })

  try {
    const { error } = await supabase
      .from("users")
      .update({ avatar_decoration: decoration })
      .eq("user_id", user.id)

    if (error) throw error
    res.json({ avatar_decoration: decoration })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
