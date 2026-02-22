import { supabase } from "#lib/supabase-ssr.js"

export async function handleRemoveItem(req, res) {
  const { listId, itemId } = req.body

  if (!listId || !itemId)
    return res.status(400).json({ error: "missing fields" })

  try {
    const { data: list } = await supabase
      .from("lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", req.user.id)
      .single()

    if (!list) return res.status(404).json({ error: "list not found" })

    const { error } = await supabase
      .from("list_items")
      .delete()
      .eq("id", itemId)
      .eq("list_id", listId)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}