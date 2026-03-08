import { supabase } from "#lib/supabase-ssr.js"
import { VALID_SLOTS } from "../constants.js"

export async function handleUnequip(req, res) {
  const userId = req.user.id
  const { slot } = req.body

  if (!slot) {
    return res.status(400).json({ error: "missing_slot" })
  }

  if (!VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: "invalid_slot" })
  }

  const { error } = await supabase
    .from("user_equipped_items")
    .delete()
    .eq("user_id", userId)
    .eq("slot", slot)

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_unequip" })
  }

  return res.json({ success: true })
}
