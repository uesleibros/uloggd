import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  try {
    await supabase.from("users").delete().eq("user_id", req.user.id)
    await supabase.auth.admin.deleteUser(req.user.id)

    res.json({ deleted: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
