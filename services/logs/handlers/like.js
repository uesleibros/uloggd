import { supabase } from "#lib/supabase-ssr.js"
import { getUser } from "#utils/auth.js"
import { createNotification } from "#services/notifications/create.js"

export async function handleLike(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { logId, action } = req.body

  if (!logId) return res.status(400).json({ error: "missing logId" })
  if (!["like", "unlike"].includes(action)) return res.status(400).json({ error: "invalid action" })

  try {
    if (action === "like") {
      const { error } = await supabase
        .from("log_likes")
        .upsert(
          { user_id: user.id, log_id: logId },
          { onConflict: "user_id,log_id" }
        )

      if (error) throw error

      const { data: log } = await supabase
        .from("logs")
        .select("user_id, game_slug")
        .eq("id", logId)
        .single()

      if (log && log.user_id !== user.id) {
        await createNotification({
          userId: log.user_id,
          type: "log_like",
          data: { liker_id: user.id, log_id: logId, game_slug: log.game_slug },
          dedupeKey: { liker_id: user.id, log_id: logId },
        })
      }

      return res.json({ liked: true })
    }

    const { error } = await supabase
      .from("log_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("log_id", logId)

    if (error) throw error
    res.json({ liked: false })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
