import { supabase } from "#lib/supabase-ssr.js"

export async function handleLikeStatus(req, res) {
  const { reviewId, currentUserId } = req.body

  if (!reviewId) return res.status(400).json({ error: "missing reviewId" })

  try {
    const [countRes, isLikedRes] = await Promise.all([
      supabase
        .from("review_likes")
        .select("*", { count: "exact", head: true })
        .eq("review_id", reviewId),

      currentUserId
        ? supabase
            .from("review_likes")
            .select("id")
            .eq("review_id", reviewId)
            .eq("user_id", currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    res.json({
      count: countRes.count || 0,
      isLiked: !!isLikedRes.data,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
