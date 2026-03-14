import { supabase } from "#lib/supabase-ssr.js"

export async function handleCustomCovers(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const { data, error } = await supabase
      .from("user_games")
      .select("game_slug, custom_cover_url")
      .eq("user_id", userId)
      .not("custom_cover_url", "is", null)

    if (error) throw error

    const covers = {}
    for (const row of data) {
      covers[row.game_slug] = row.custom_cover_url
    }

    res.json(covers)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
