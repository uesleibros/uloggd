// services/lists/toggleMark.js
import { supabase } from "#lib/supabase-ssr.js"

export async function handleToggleMark(req, res) {
  const { itemId, marked } = req.body

  if (!itemId || typeof marked !== "boolean")
    return res.status(400).json({ error: "itemId and marked (boolean) required" })

  try {
    const { data: item, error: fetchErr } = await supabase
      .from("list_items")
      .select("id, list_id, lists!inner(user_id)")
      .eq("id", itemId)
      .single()

    if (fetchErr || !item)
      return res.status(404).json({ error: "item not found" })

    if (item.lists.user_id !== req.user.id)
      return res.status(403).json({ error: "forbidden" })

    const { error: updateErr } = await supabase
      .from("list_items")
      .update({ marked })
      .eq("id", itemId)

    if (updateErr) throw updateErr

    res.json({ id: itemId, marked })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}