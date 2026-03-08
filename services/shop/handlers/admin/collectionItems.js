import { supabase } from "#lib/supabase-ssr.js"

export async function handleAdminCollectionItems(req, res) {
  if (req.method === "POST") {
    const { collection_id, item_id, sort_order } = req.body
    if (!collection_id || !item_id) return res.status(400).json({ error: "missing_fields" })

    const { data: existing } = await supabase
      .from("store_collection_items")
      .select("id")
      .eq("collection_id", collection_id)
      .eq("item_id", item_id)
      .maybeSingle()

    if (existing) return res.status(409).json({ error: "already_in_collection" })

    const { data, error } = await supabase
      .from("store_collection_items")
      .insert({ collection_id, item_id, sort_order: sort_order || 0 })
      .select()
      .single()

    if (error) return res.status(500).json({ error: "add_failed" })
    return res.status(201).json({ entry: data })
  }

  if (req.method === "PUT") {
    const { collection_id, item_id, sort_order } = req.body
    if (!collection_id || !item_id || sort_order === undefined) {
      return res.status(400).json({ error: "missing_fields" })
    }

    const { error } = await supabase
      .from("store_collection_items")
      .update({ sort_order })
      .eq("collection_id", collection_id)
      .eq("item_id", item_id)

    if (error) return res.status(500).json({ error: "update_failed" })
    return res.json({ success: true })
  }

  if (req.method === "DELETE") {
    const { collection_id, item_id } = req.body
    if (!collection_id || !item_id) return res.status(400).json({ error: "missing_fields" })

    const { error } = await supabase
      .from("store_collection_items")
      .delete()
      .eq("collection_id", collection_id)
      .eq("item_id", item_id)

    if (error) return res.status(500).json({ error: "remove_failed" })
    return res.json({ success: true })
  }

  return res.status(405).end()
}