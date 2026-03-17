import { supabase } from "#lib/supabase-ssr.js"
import { sanitize } from "#services/journeys/utils/sanitize.js"
import { validateDate, validateTime, runValidations } from "#services/journeys/utils/validators.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleAddEntry(req, res) {
  const { journeyId, playedOn, hours, minutes, note, setStarted, setFinished } = req.body

  if (!journeyId || typeof journeyId !== "number")
    return res.status(400).json({ error: "invalid journeyId" })

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
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select("id, started_at, finished_at")
      .eq("id", journeyId)
      .eq("user_id", req.user.id)
      .single()

    if (journeyError || !journey)
      return res.status(404).json({ error: "journey not found" })

    const { data, error } = await supabase
      .from("journey_entries")
      .insert({
        journey_id: journeyId,
        played_on: playedOn || new Date().toISOString().split("T")[0],
        hours: h,
        minutes: m,
        note: sanitize(note, LIMITS.MAX_NOTE),
      })
      .select()
      .single()

    if (error) throw error

    const milestoneUpdates = { updated_at: new Date().toISOString() }

    if (setStarted !== undefined) milestoneUpdates.started_at = setStarted || null
    if (setFinished !== undefined) milestoneUpdates.finished_at = setFinished || null

    await supabase
      .from("journeys")
      .update(milestoneUpdates)
      .eq("id", journeyId)

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
