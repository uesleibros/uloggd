import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"

export async function handleLike(req, res) {
  const { reviewId, action } = req.body

  if (!reviewId) return res.status(400).json({ error: "missing reviewId" })
  if (!["like", "unlike"].includes(action)) return res.status(400).json({ error: "invalid action" })

  try {
    if (action === "like") {
      const { error } = await supabase
        .from("review_likes")
        .upsert(
          { user_id: req.user.id, review_id: reviewId },
          { onConflict: "user_id,review_id" }
        )

      if (error) throw error

      const { data: review } = await supabase
        .from("reviews")
        .select("user_id, game_slug")
        .eq("id", reviewId)
        .single()

      if (review && review.user_id !== req.user.id) {
        await createNotification({
          userId: review.user_id,
          type: "review_like",
          data: { liker_id: req.user.id, review_id: reviewId, game_slug: review.game_slug },
          dedupeKey: { liker_id: req.user.id, review_id: reviewId },
        })
      }

      return res.json({ liked: true })
    }

    const { error } = await supabase
      .from("review_likes")
      .delete()
      .eq("user_id", req.user.id)
      .eq("review_id", reviewId)

    if (error) throw error
    res.json({ liked: false })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
