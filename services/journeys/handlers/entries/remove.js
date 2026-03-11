import { supabase } from "#lib/supabase-ssr.js"

export async function handleRemoveEntry(req, res) {
  const { entryId } = req.body

  if (!entryId || typeof entryId !== "number")
    return res.status(400).json({ error: "invalid entryId" })

  try {
    const { data: entry, error: entryError } = await supabase
      .from("journey_entries")
      .select(`
        id,
        played_on,
        journey_id,
        journeys!inner(user_id, started_at, finished_at)
      `)
      .eq("id", entryId)
      .single()

    if (entryError || !entry)
      return res.status(404).json({ error: "entry not found" })

    if (entry.journeys.user_id !== req.user.id)
      return res.status(403).json({ error: "forbidden" })

    const { error } = await supabase
      .from("journey_entries")
      .delete()
      .eq("id", entryId)

    if (error) throw error

    const milestoneUpdates = { updated_at: new Date().toISOString() }

    if (entry.played_on === entry.journeys.started_at)
      milestoneUpdates.started_at = null

    if (entry.played_on === entry.journeys.finished_at)
      milestoneUpdates.finished_at = null

    await supabase
      .from("journeys")
      .update(milestoneUpdates)
      .eq("id", entry.journey_id)

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
