import { supabase } from "../../../lib/supabase-ssr.js"

export async function handleStats(req, res) {
  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("logs")
      .select("rating, status, liked")
      .eq("game_id", gameId)
      .not("rating", "is", null)

    if (error) throw error

    const ratings = data.filter(l => l.rating != null).map(l => l.rating)
    const avgRating = ratings.length > 0
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : null

    const { count: totalLogs } = await supabase
      .from("logs")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)

    const { count: totalLikes } = await supabase
      .from("logs")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("liked", true)

    const statusCounts = {}
    data.forEach(l => {
      if (l.status) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1
    })

    res.json({ avgRating, totalRatings: ratings.length, totalLogs, totalLikes, statusCounts })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch stats" })
  }
}