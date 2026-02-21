import { supabase } from "#lib/supabase-ssr.js"
import { AVATAR_DECORATIONS } from "#data/avatarDecorations.js"

const VALID_DECORATIONS = AVATAR_DECORATIONS.map(d => d.id)

export async function handleDecoration(req, res) {
  const { decoration } = req.body || {}

  if (decoration != null && typeof decoration !== "string")
    return res.status(400).json({ error: "invalid type" })

  if (decoration != null && !VALID_DECORATIONS.includes(decoration))
    return res.status(400).json({ error: "invalid decoration" })

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ avatar_decoration: decoration })
      .eq("user_id", req.user.id)
      .select("id, avatar_decoration")
      .single()

    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
