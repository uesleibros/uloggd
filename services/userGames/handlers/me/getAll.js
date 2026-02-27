import { supabase } from "#lib/supabase-ssr.js"

export async function handleGetAll(req, res) {
  try {
    const { data, error } = await supabase
      .from("user_games")
      .select("game_id, game_slug, status, playing, backlog, wishlist, liked")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}