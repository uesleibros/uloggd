import { supabase } from "#lib/supabase-ssr.js"

export async function handleUpdate(req, res) {
  const { tierlistId, title, description, isPublic, tiers, items } = req.body

  if (!tierlistId) return res.status(400).json({ error: "tierlistId required" })

  try {
    const { data: existing, error: checkError } = await supabase
      .from("tierlists")
      .select("id")
      .eq("id", tierlistId)
      .eq("user_id", req.user.id)
      .single()

    if (checkError || !existing) return res.status(404).json({ error: "not found" })

    if (title !== undefined || description !== undefined || isPublic !== undefined) {
      const updates = {}
      if (title !== undefined) updates.title = title.slice(0, 100)
      if (description !== undefined) updates.description = description?.slice(0, 500) || null
      if (isPublic !== undefined) updates.is_public = isPublic
      updates.updated_at = new Date().toISOString()

      await supabase
        .from("tierlists")
        .update(updates)
        .eq("id", tierlistId)
    }

    if (tiers) {
      await supabase.from("tierlist_tiers").delete().eq("tierlist_id", tierlistId)
      
      if (tiers.length > 0) {
        await supabase
          .from("tierlist_tiers")
          .insert(tiers.map(t => ({
            id: t.id,
            tierlist_id: tierlistId,
            label: t.label,
            color: t.color,
            position: t.position,
          })))
      }
    }

    if (items) {
      const tierIds = tiers?.map(t => t.id) || []
      if (tierIds.length > 0) {
        await supabase
          .from("tierlist_items")
          .delete()
          .in("tier_id", tierIds)
      }

      const itemsToInsert = items.filter(i => i.tier_id)
      if (itemsToInsert.length > 0) {
        await supabase
          .from("tierlist_items")
          .insert(itemsToInsert.map(i => ({
            id: i.id,
            tier_id: i.tier_id,
            game_id: i.game_id,
            game_slug: i.game_slug,
            position: i.position,
          })))
      }
    }

    return res.json({ success: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "fail" })
  }
}