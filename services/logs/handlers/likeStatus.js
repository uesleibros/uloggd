import { supabase } from "#lib/supabase-ssr.js"

export async function handleLikeStatus(req, res) {
  const { logId, currentUserId } = req.body

  if (!logId) return res.status(400).json({ error: "missing logId" })

  try {
    const [countRes, isLikedRes] = await Promise.all([
      supabase
        .from("log_likes")
        .select("*", { count: "exact", head: true })
        .eq("log_id", logId),

      currentUserId
        ? supabase
            .from("log_likes")
            .select("id")
            .eq("log_id", logId)
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
