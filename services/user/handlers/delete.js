import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"

export async function handleDelete(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  try {
    await Promise.all([
      supabase.from("follows").delete().eq("follower_id", user.id),
      supabase.from("follows").delete().eq("following_id", user.id),
    ])

    await supabase.from("users").delete().eq("user_id", user.id)
    await supabase.auth.admin.deleteUser(user.id)

    res.json({ deleted: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}