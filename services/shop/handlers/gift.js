import { supabase } from "#lib/supabase-ssr.js"
import { MINERALS } from "../constants.js"

export async function handleGift(req, res) {
  const userId = req.user.id
  const { itemId, recipientId } = req.body

  if (!itemId || !recipientId) {
    return res.status(400).json({ error: "missing_params" })
  }

  if (userId === recipientId) {
    return res.status(400).json({ error: "cannot_gift_yourself" })
  }

  const { data: recipient } = await supabase
    .from("users")
    .select("user_id, username")
    .eq("user_id", recipientId)
    .single()

  if (!recipient) {
    return res.status(404).json({ error: "recipient_not_found" })
  }

  const { data: item, error: itemError } = await supabase
    .from("store_items")
    .select("*")
    .eq("id", itemId)
    .eq("is_active", true)
    .single()

  if (itemError || !item) {
    return res.status(404).json({ error: "item_not_found" })
  }

  const now = new Date()
  if (item.available_from && now < new Date(item.available_from)) {
    return res.status(400).json({ error: "item_not_yet_available" })
  }
  if (item.available_until && now > new Date(item.available_until)) {
    return res.status(400).json({ error: "item_expired" })
  }
  if (item.current_stock !== null && item.current_stock <= 0) {
    return res.status(400).json({ error: "out_of_stock" })
  }

  const { data: recipientOwnership } = await supabase
    .from("user_inventory")
    .select("id")
    .eq("user_id", recipientId)
    .eq("item_id", itemId)
    .single()

  if (recipientOwnership) {
    return res.status(400).json({ error: "recipient_already_owns" })
  }

  const { data: minerals } = await supabase
    .from("user_minerals")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (!minerals) {
    return res.status(400).json({ error: "no_minerals" })
  }

  const cost = {}
  for (const m of MINERALS) {
    cost[m] = item[`price_${m}`] || 0
  }

  for (const m of MINERALS) {
    if (minerals[m] < cost[m]) {
      return res.status(400).json({ error: "insufficient_minerals", mineral: m })
    }
  }

  const updated = {}
  const changed = {}
  for (const m of MINERALS) {
    updated[m] = minerals[m] - cost[m]
    if (cost[m] > 0) changed[m] = -cost[m]
  }

  const { error: updateError } = await supabase
    .from("user_minerals")
    .update({ ...updated, updated_at: new Date().toISOString() })
    .eq("user_id", userId)

  if (updateError) {
    console.error(updateError)
    return res.status(500).json({ error: "failed_to_update_minerals" })
  }

  const { data: transaction } = await supabase
    .from("mineral_transactions")
    .insert({
      user_id: userId,
      transaction_type: "shop_gift",
      minerals_changed: changed,
      description: "shop_gift",
      details: `${recipient.username}: ${item.name}`
    })
    .select("id")
    .single()

  const { error: inventoryError } = await supabase
    .from("user_inventory")
    .insert({
      user_id: recipientId,
      item_id: itemId,
      paid_copper: cost.copper,
      paid_iron: cost.iron,
      paid_gold: cost.gold,
      paid_emerald: cost.emerald,
      paid_diamond: cost.diamond,
      paid_ruby: cost.ruby,
      acquisition_type: "gift",
      gifted_by: userId,
      mineral_transaction_id: transaction?.id || null,
    })

  if (inventoryError) {
    console.error(inventoryError)
    return res.status(500).json({ error: "failed_to_add_inventory" })
  }

  if (item.current_stock !== null) {
    await supabase
      .from("store_items")
      .update({
        current_stock: item.current_stock - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
  }

  await supabase.from("notifications").insert({
    user_id: recipientId,
    type: "gift_received",
    data: {
      from_user_id: userId,
      item_id: item.id,
      item_name: item.name,
      item_slug: item.slug,
    },
  })

  return res.json({
    success: true,
    item: { id: item.id, slug: item.slug, name: item.name },
    recipient: { id: recipient.user_id, username: recipient.username },
    minerals: updated,
  })
}