import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { sanitize, safePlatform } from "#services/journeys/utils/sanitize.js"
import { validateTitle, runValidations } from "#services/journeys/utils/validators.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleCreate(req, res) {
  const { gameId, gameSlug, title, platformId } = req.body

  if (!gameId || typeof gameId !== "number")
    return res.status(400).json({ error: "invalid gameId" })
  if (!gameSlug || typeof gameSlug !== "string")
    return res.status(400).json({ error: "invalid gameSlug" })

  const validationError = runValidations([
    { check: validateTitle, args: [title] },
  ])
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const games = await query(
      "games",
      `fields id; where id = ${Math.floor(gameId)}; limit 1;`
    )
    if (!games.length)
      return res.status(404).json({ error: "game not found" })
  } catch (e) {
    console.error(e)
    return res.status(502).json({ error: "fail" })
  }

  try {
    const { data, error } = await supabase
      .from("journeys")
      .insert({
        user_id: req.user.id,
        game_id: gameId,
        game_slug: gameSlug.trim().slice(0, LIMITS.MAX_SLUG),
        title: sanitize(title, LIMITS.MAX_TITLE),
        platform_id: safePlatform(platformId),
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
