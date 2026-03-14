import { supabase } from "#lib/supabase-ssr.js"

export async function handleCustomCovers(req, res) {
  const { userId, slugs } = req.query

  if (!userId) {
    return res.status(400).json({ error: "userId required" })
  }

  const slugList = Array.isArray(slugs) ? slugs : slugs ? [slugs] : []

  if (slugList.length === 0) {
    return res.json({ covers: {} })
  }

  try {
    const { data, error } = await supabase
      .from("user_games")
      .select("game_slug, custom_cover_url")
      .eq("user_id", userId)
      .in("game_slug", slugList)
      .not("custom_cover_url", "is", null)

    if (error) throw error

    const covers = {}
    for (const row of data || []) {
      covers[row.game_slug] = row.custom_cover_url
    }

    res.json({ covers })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
