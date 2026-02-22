import { supabase } from "#lib/supabase-ssr.js"

export async function handleDelete(req, res) {
  const { listId } = req.body
  if (!listId) return res.status(400).json({ error: "missing listId" })

  try {
    const { error } = await supabase
      .from("lists")
      .delete()
      .eq("id", listId)
      .eq("user_id", req.user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}