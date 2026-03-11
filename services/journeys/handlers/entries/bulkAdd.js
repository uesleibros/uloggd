import { supabase } from "#lib/supabase-ssr.js"
import { validateDate } from "#services/journeys/utils/validators.js"

export async function handleBulkAddEntries(req, res) {
  const { journeyId, dates } = req.body

  if (!journeyId || typeof journeyId !== "number")
    return res.status(400).json({ error: "invalid journeyId" })

  if (!Array.isArray(dates) || dates.length === 0 || dates.length > 31)
    return res.status(400).json({ error: "invalid dates array" })

  for (const d of dates) {
    const err = validateDate(d)
    if (err) return res.status(400).json({ error: `invalid date ${d}: ${err}` })
  }

  try {
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select("id")
      .eq("id", journeyId)
      .eq("user_id", req.user.id)
      .single()

    if (journeyError || !journey)
      return res.status(404).json({ error: "journey not found" })

    const { data: existing } = await supabase
      .from("journey_entries")
      .select("played_on")
      .eq("journey_id", journeyId)
      .in("played_on", dates)

    const existingSet = new Set((existing || []).map(e => e.played_on))
    const newDates = dates.filter(d => !existingSet.has(d))

    if (newDates.length === 0)
      return res.json({ inserted: 0, entries: [] })

    const rows = newDates.map(d => ({
      journey_id: journeyId,
      played_on: d,
      hours: 0,
      minutes: 0,
      note: null,
    }))

    const { data, error } = await supabase
      .from("journey_entries")
      .insert(rows)
      .select()

    if (error) throw error

    await supabase
      .from("journeys")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", journeyId)

    res.json({ inserted: data.length, entries: data })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}