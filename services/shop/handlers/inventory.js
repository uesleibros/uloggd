import { supabase } from "#lib/supabase-ssr.js"

export async function handleInventory(req, res) {
  const userId = req.user.id
  const { type } = req.query

  let query = supabase
    .from("user_inventory")
    .select(`
      id,
      purchased_at,
      acquisition_type,
      gifted_by,
      item:store_items!inner(
        id,
        slug,
        name,
        description,
        preview_url,
        asset_url,
        item_type,
        metadata,
        category:store_categories(slug, name, icon)
      )
    `)
    .eq("user_id", userId)
    .order("purchased_at", { ascending: false })

  if (type) {
    query = query.eq("item.item_type", type)
  }

  const { data, error } = await query

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_fetch_inventory" })
  }

  const { data: equipped } = await supabase
    .from("user_equipped_items")
    .select("inventory_id, slot")
    .eq("user_id", userId)

  const equippedMap = {}
  for (const e of equipped || []) {
    equippedMap[e.inventory_id] = e.slot
  }

  const items = data.map((inv) => ({
    inventory_id: inv.id,
    purchased_at: inv.purchased_at,
    acquisition_type: inv.acquisition_type,
    gifted_by: inv.gifted_by,
    equipped_slot: equippedMap[inv.id] || null,
    ...inv.item,
  }))

  return res.json({ items })
}