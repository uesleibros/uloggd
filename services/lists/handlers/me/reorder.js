import { supabase } from "#lib/supabase-ssr.js"

export async function handleReorder(req, res) {
  const { listId, items } = req.body

  if (!listId || !Array.isArray(items))
    return res.status(400).json({ error: "missing fields" })

  try {
    const { data: list } = await supabase
      .from("lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", req.user.id)
      .single()

    if (!list) return res.status(404).json({ error: "list not found" })

    const updates = items.map((itemId, index) =>
      supabase
        .from("list_items")
        .update({ position: index })
        .eq("id", itemId)
        .eq("list_id", listId)
    )

    await Promise.all(updates)
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}