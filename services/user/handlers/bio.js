import { supabase } from "#lib/supabase-ssr.js"
import { getUser } from "#utils/auth.js"
import { MAX_BIO } from "#services/user/constants.js"

export async function handleBio(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { bio } = req.body

  if (bio === undefined) return res.status(400).json({ error: "missing bio" })
  if (typeof bio !== "string") return res.status(400).json({ error: "bio must be a string" })
  if (bio.length > MAX_BIO) return res.status(400).json({ error: `bio too long (max ${MAX_BIO})` })

  try {
    const { error } = await supabase
      .from("users")
      .update({ bio })
      .eq("user_id", user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}