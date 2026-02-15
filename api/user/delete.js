import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "unauthorized" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "unauthorized" })

  try {
    await supabase.from("follows").delete().eq("follower_id", user.id)
    await supabase.from("follows").delete().eq("following_id", user.id)
    await supabase.from("users").delete().eq("user_id", user.id)
    await supabase.auth.admin.deleteUser(user.id)

    res.json({ deleted: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}