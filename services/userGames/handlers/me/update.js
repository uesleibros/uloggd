import { supabase } from "#lib/supabase-ssr.js"
import { VALID_STATUSES, ALLOWED_FIELDS, BOOLEAN_FIELDS, DEFAULT_GAME_STATE, MAX_SLUG } from "#services/userGames/constants.js"

function isEmptyGameState(record) {
  return (
    record.status === null &&
    record.playing === false &&
    record.backlog === false &&
    record.wishlist === false &&
    record.liked === false &&
    record.rating === null
  )
}

export async function handleUpdate(req, res) {
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
      .select("*")
      .eq("user_id", req.user.id)
      .eq("game_id", gameId)
      .maybeSingle()

    let result

    if (existing) {
      const updated = { ...existing, [field]: value }

      if (isEmptyGameState(updated)) {
        const { error } = await supabase
          .from("user_games")
          .delete()
          .eq("id", existing.id)

        if (error) throw error

        return res.json({ deleted: true, gameId, gameSlug })
      }

      const { data, error } = await supabase
        .from("user_games")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const newRecord = {
        ...DEFAULT_GAME_STATE,
        [field]: value,
      }

      if (isEmptyGameState(newRecord)) {
        return res.json({ skipped: true, gameId, gameSlug })
      }

      const { data, error } = await supabase
        .from("user_games")
        .insert({
          user_id: req.user.id,
          game_id: gameId,
          game_slug: gameSlug.trim().slice(0, MAX_SLUG),
          ...newRecord,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}