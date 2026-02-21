import { supabase } from "#lib/supabase-ssr.js"
import { MAX_PRONOUN } from "#services/users/constants.js"

export async function handlePronoun(req, res) {
  const { pronoun } = req.body

  if (pronoun === undefined) return res.status(400).json({ error: "missing pronoun" })
  if (typeof pronoun !== "string") return res.status(400).json({ error: "pronoun must be a string" })
  if (pronoun.length > MAX_PRONOUN) return res.status(400).json({ error: `pronoun too long (max ${MAX_PRONOUN})` })

  try {
    const trimmed = pronoun.trim()
    const { error } = await supabase
      .from("users")
      .update({ pronoun: trimmed || null })
      .eq("user_id", req.user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
