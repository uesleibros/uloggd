import { supabase } from "#lib/supabase-ssr.js"

export async function handleEquipped(req, res) {
  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ error: "missing_user_id" })
  }

  const { data, error } = await supabase
    .from("user_equipped_items")
    .select(`
      slot,
      equipped_at,
      inventory:user_inventory!inner(
        item:store_items!inner(
          id,
          slug,
          name,
          asset_url,
          item_type,
          metadata
        )
      )
    `)
    .eq("user_id", userId)

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_fetch_equipped" })
  }

  const equipped = {}
  for (const e of data || []) {
    equipped[e.slot] = {
      equipped_at: e.equipped_at,
      ...e.inventory.item,
    }
  }

  return res.json({ equipped })
}