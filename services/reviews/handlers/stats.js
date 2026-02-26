import { supabase } from "#lib/supabase-ssr.js"

export async function handleStats(req, res) {
  const { gameId } = req.query
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const [ratingsRes, totalRes, likesRes] = await Promise.all([
      supabase
        .from("reviews")
        .select("rating, status, liked")
        .eq("game_id", gameId)
        .not("rating", "is", null),
      supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId),
      supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("liked", true),
    ])

    if (ratingsRes.error) throw ratingsRes.error

    const ratings = ratingsRes.data.filter(r => r.rating != null).map(r => r.rating)
    const avgRating = ratings.length > 0
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : null

    const statusCounts = {}
    ratingsRes.data.forEach(r => {
      if (r.status) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    })

    res.json({
      avgRating,
      totalRatings: ratings.length,
      totalReviews: totalRes.count,
      totalLikes: likesRes.count,
      statusCounts,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
