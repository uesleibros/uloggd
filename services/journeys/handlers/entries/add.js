import { supabase } from "#lib/supabase-ssr.js"
import { sanitize } from "#services/journeys/utils/sanitize.js"
import { validateDate, validateTime, runValidations } from "#services/journeys/utils/validators.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleAddEntry(req, res) {
  const { journeyId, playedOn, hours, minutes, note } = req.body

  if (!journeyId || typeof journeyId !== "number")
    return res.status(400).json({ error: "invalid journeyId" })

  const validationError = runValidations([
    { check: validateDate, args: [playedOn] },
    { check: validateTime, args: [hours ?? 0, minutes ?? 0] },
  ])
  if (validationError) return res.status(400).json({ error: validationError })

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
      .insert({
        journey_id: journeyId,
        played_on: playedOn || new Date().toISOString().split("T")[0],
        hours: hours ?? 0,
        minutes: minutes ?? 0,
        note: sanitize(note, LIMITS.MAX_NOTE),
      })
      .select()
      .single()

    if (error) throw error

    await supabase
      .from("journeys")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", journeyId)

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
