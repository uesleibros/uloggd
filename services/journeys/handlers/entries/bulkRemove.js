import { supabase } from "#lib/supabase-ssr.js"

export async function handleBulkRemoveEntries(req, res) {
  const { journeyId, dates } = req.body

  if (!journeyId || typeof journeyId !== "number")
    return res.status(400).json({ error: "invalid journeyId" })

  if (!Array.isArray(dates) || dates.length === 0 || dates.length > 31)
    return res.status(400).json({ error: "invalid dates array" })

  try {
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select("id")
      .eq("id", journeyId)
      .eq("user_id", req.user.id)
      .single()

    if (journeyError || !journey)
      return res.status(404).json({ error: "journey not found" })

    const { data, error } = await supabase
      .from("journey_entries")
      .delete()
      .eq("journey_id", journeyId)
      .in("played_on", dates)
      .select("id")

    if (error) throw error

    await supabase
      .from("journeys")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", journeyId)

    res.json({ removed: data.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}