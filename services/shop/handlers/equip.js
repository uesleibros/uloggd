import { supabase } from "#lib/supabase-ssr.js"
import { VALID_SLOTS, TYPE_TO_SLOTS } from "../constants.js"

export async function handleEquip(req, res) {
  const userId = req.user.id
  const { inventoryId, slot } = req.body

  if (!inventoryId || !slot) {
    return res.status(400).json({ error: "missing_params" })
  }

  if (!VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: "invalid_slot" })
  }

  const { data: inventory, error: invError } = await supabase
    .from("user_inventory")
    .select(`
      id,
      item:store_items!inner(id, item_type, asset_url)
    `)
    .eq("id", inventoryId)
    .eq("user_id", userId)
    .single()

  if (invError || !inventory) {
    return res.status(404).json({ error: "item_not_in_inventory" })
  }

  const allowedSlots = TYPE_TO_SLOTS[inventory.item.item_type] || []
  if (!allowedSlots.includes(slot)) {
    return res.status(400).json({ error: "incompatible_slot" })
  }

  const { error: equipError } = await supabase
    .from("user_equipped_items")
    .upsert({
      user_id: userId,
      slot,
      inventory_id: inventoryId,
      equipped_at: new Date().toISOString(),
    }, { onConflict: "user_id,slot" })

  if (equipError) {
    console.error(equipError)
    return res.status(500).json({ error: "failed_to_equip" })
  }

  return res.json({ success: true, slot })

}
