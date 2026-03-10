import { supabase } from "#lib/supabase-ssr.js"
import { sanitize, safePlatform } from "#services/journeys/utils/sanitize.js"
import { validateTitle, runValidations } from "#services/journeys/utils/validators.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleUpdate(req, res) {
  const { journeyId, title, platformId } = req.body

  if (!journeyId || typeof journeyId !== "number")
    return res.status(400).json({ error: "invalid journeyId" })

  const validationError = runValidations([
    { check: validateTitle, args: [title] },
  ])
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const { data, error } = await supabase
      .from("journeys")
      .update({
        title: sanitize(title, LIMITS.MAX_TITLE),
        platform_id: safePlatform(platformId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", journeyId)
      .eq("user_id", req.user.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: "journey not found" })

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
