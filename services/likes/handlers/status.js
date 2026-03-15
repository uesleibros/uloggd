import { supabase } from "#lib/supabase-ssr.js"
import { getLikeConfig } from "../config.js"

export async function handleStatus(req, res) {
  const { type, targetId, currentUserId } = req.query

  const config = getLikeConfig(type)
  if (!config) {
    return res.status(400).json({ error: "invalid type" })
  }

  if (!targetId) {
    return res.status(400).json({ error: "missing targetId" })
  }

  try {
    const [countRes, isLikedRes] = await Promise.all([
      supabase
        .from(config.table)
        .select("*", { count: "exact", head: true })
        .eq(config.targetColumn, targetId),

      currentUserId
        ? supabase
            .from(config.table)
            .select("id")
            .eq(config.targetColumn, targetId)
            .eq("user_id", currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ])

    res.json({
      count: countRes.count || 0,
      isLiked: !!isLikedRes.data
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}