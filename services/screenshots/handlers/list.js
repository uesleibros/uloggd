import { supabase } from "#lib/supabase-ssr.js"

export async function handleList(req, res) {
  const { userId, gameSlug, page = 1, limit = 24 } = req.query

  if (!userId) return res.status(400).json({ error: "userId required" })

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  try {
    let query = supabase
      .from("screenshots")
      .select("id, image_url, game_id, game_slug, caption, is_spoiler, position, created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .range(offset, offset + limitNum - 1)

    if (gameSlug) {
      query = query.eq("game_slug", gameSlug)
    }

    const { data, count, error } = await query

    if (error) throw error

    res.json({
      screenshots: data || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}