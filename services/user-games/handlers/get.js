import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"
import { DEFAULT_GAME_STATE } from "../constants.js"

export async function handleGet(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle()

    if (error) throw error
    res.json(data || { ...DEFAULT_GAME_STATE })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch" })
  }
}