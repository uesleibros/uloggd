import { supabase } from "#lib/supabase-ssr.js"

export async function handleBulkRemoveEntries(req, res) {
  const { entryIds } = req.body

  if (!Array.isArray(entryIds) || entryIds.length === 0 || entryIds.length > 31)
    return res.status(400).json({ error: "invalid entryIds array" })

  if (entryIds.some(id => typeof id !== "number" || isNaN(id)))
    return res.status(400).json({ error: "invalid entryId in array" })

  try {
    const { data: entries, error: fetchError } = await supabase
      .from("journey_entries")
      .select(`
        id,
        journey_id,
        journeys!inner(user_id)
      `)
      .in("id", entryIds)

    if (fetchError) throw fetchError

    if (entries.length !== entryIds.length)
      return res.status(404).json({ error: "some entries not found" })

    if (entries.some(e => e.journeys.user_id !== req.user.id))
      return res.status(403).json({ error: "forbidden" })

    const { error } = await supabase
      .from("journey_entries")
      .delete()
      .in("id", entryIds)

    if (error) throw error

    const journeyIds = [...new Set(entries.map(e => e.journey_id))]
    await supabase
      .from("journeys")
      .update({ updated_at: new Date().toISOString() })
      .in("id", journeyIds)

    res.json({ removed: entryIds.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}