import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  const { tierlistId } = req.body

  if (!tierlistId) return res.status(400).json({ error: "tierlistId required" })

  try {
    const { error } = await supabase
      .from("tierlists")
      .delete()
      .eq("id", tierlistId)
      .eq("user_id", req.user.id)

    if (error) throw error

    return res.json({ success: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "fail" })
  }
}