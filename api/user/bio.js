import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "unauthorized" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "unauthorized" })

  const { bio } = req.body

  if (bio === undefined) return res.status(400).json({ error: "missing bio" })
  if (typeof bio !== "string") return res.status(400).json({ error: "bio must be a string" })
  if (bio.length > 10000) return res.status(400).json({ error: "bio too long (max 10000)" })

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
