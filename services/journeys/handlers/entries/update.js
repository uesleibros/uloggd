import { supabase } from "#lib/supabase-ssr.js"
import { sanitize } from "#services/journeys/utils/sanitize.js"
import { validateDate, validateTime, runValidations } from "#services/journeys/utils/validators.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleUpdateEntry(req, res) {
  const { entryId, playedOn, hours, minutes, note, setStarted, setFinished } = req.body

  if (!entryId || typeof entryId !== "number")
    return res.status(400).json({ error: "invalid entryId" })

  const h = hours ?? 0
  const m = minutes ?? 0
  const totalMinutes = h * 60 + m

  if (totalMinutes > 1440)
    return res.status(400).json({ error: "max 24 hours per entry" })

  const validationError = runValidations([
    { check: validateDate, args: [playedOn] },
    { check: validateTime, args: [h, m] },
  ])
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const { data: entry, error: entryError } = await supabase
      .from("journey_entries")
      .select(`
        id,
        journey_id,
        journeys!inner(user_id)
      `)
      .eq("id", entryId)
      .single()

    if (entryError || !entry)
      return res.status(404).json({ error: "entry not found" })

    if (entry.journeys.user_id !== req.user.id)
      return res.status(403).json({ error: "forbidden" })

    const { data, error } = await supabase
      .from("journey_entries")
      .update({
        played_on: playedOn || undefined,
        hours: h,
        minutes: m,
        note: sanitize(note, LIMITS.MAX_NOTE),
      })
      .eq("id", entryId)
      .select()
      .single()

    if (error) throw error

    if (setStarted !== undefined || setFinished !== undefined) {
      const milestoneUpdates = { updated_at: new Date().toISOString() }
      if (setStarted !== undefined) milestoneUpdates.started_at = setStarted || null
      if (setFinished !== undefined) milestoneUpdates.finished_at = setFinished || null

      await supabase
        .from("journeys")
        .update(milestoneUpdates)
        .eq("id", entry.journey_id)
    }

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
