import { supabase } from "#lib/supabase-ssr.js"

export async function handleGame(req, res) {
  const { gameId } = req.query
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", req.user.id)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
