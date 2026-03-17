// API - /api/likes/counts.js
import { supabase } from "#lib/supabase-ssr.js"

export async function handleCounts(req, res) {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const [games, reviews, lists, tierlists, screenshots] = await Promise.all([
      supabase
        .from("user_games")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("liked", true),
      supabase
        .from("review_likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("list_likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("tierlist_likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("screenshot_likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ])

    const counts = {
      games: games.count || 0,
      reviews: reviews.count || 0,
      lists: lists.count || 0,
      tierlists: tierlists.count || 0,
      screenshots: screenshots.count || 0,
    }

    res.json({
      ...counts,
      total: counts.games + counts.reviews + counts.lists + counts.tierlists + counts.screenshots,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}