import { supabase } from "#lib/supabase-ssr.js"
import { sanitize } from "#services/journeys/utils/sanitize.js"
import { validateDate, validateTime, runValidations } from "#services/journeys/utils/validators.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleUpdateEntry(req, res) {
  const { entryId, playedOn, hours, minutes, note } = req.body

  if (!entryId || typeof entryId !== "number")
    return res.status(400).json({ error: "invalid entryId" })

  const validationError = runValidations([
    { check: validateDate, args: [playedOn] },
    { check: validateTime, args: [hours ?? 0, minutes ?? 0] },
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
        hours: hours ?? 0,
        minutes: minutes ?? 0,
        note: sanitize(note, LIMITS.MAX_NOTE),
      })
      .eq("id", entryId)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
