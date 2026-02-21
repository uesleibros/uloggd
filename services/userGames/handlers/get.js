import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_GAME_STATE } from "#services/userGames/constants.js"

export async function handleGet(req, res) {
  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("game_id", gameId)
      .maybeSingle()

    if (error) throw error
    res.json(data || { ...DEFAULT_GAME_STATE })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
