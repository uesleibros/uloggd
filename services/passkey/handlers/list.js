import { supabase } from "#lib/supabase-ssr.js"

export async function handleList(req, res) {
  try {
    const { data, error } = await supabase
      .from("passkeys")
      .select("id, device_name, created_at, last_used_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}