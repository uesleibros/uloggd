import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"
import { VALID_STATUSES, ALLOWED_FIELDS, BOOLEAN_FIELDS, DEFAULT_GAME_STATE, MAX_SLUG } from "../constants.js"

export async function handleUpdate(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { gameId, gameSlug, field, value } = req.body

  if (!gameId || !gameSlug)
    return res.status(400).json({ error: "gameId and gameSlug required" })

  if (!ALLOWED_FIELDS.includes(field))
    return res.status(400).json({ error: "invalid field" })

  if (field === "status" && value !== null && !VALID_STATUSES.includes(value))
    return res.status(400).json({ error: "invalid status" })

  if (BOOLEAN_FIELDS.includes(field) && typeof value !== "boolean")
    return res.status(400).json({ error: "value must be boolean" })

  try {
    const { data: existing } = await supabase
      .from("user_games")
      .select("id")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle()

    let result

    if (existing) {
      const { data, error } = await supabase
        .from("user_games")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from("user_games")
        .insert({
          user_id: user.id,
          game_id: gameId,
          game_slug: gameSlug.trim().slice(0, MAX_SLUG),
          ...DEFAULT_GAME_STATE,
          [field]: value,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to update" })
  }
}