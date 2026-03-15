import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"
import { getLikeConfig } from "../config.js"

export async function handleToggle(req, res) {
  const { type, targetId, action } = req.body

  const config = getLikeConfig(type)
  if (!config) {
    return res.status(400).json({ error: "invalid type" })
  }

  if (!targetId) {
    return res.status(400).json({ error: "missing targetId" })
  }

  if (!["like", "unlike"].includes(action)) {
    return res.status(400).json({ error: "invalid action" })
  }

  try {
    const { data: target } = await supabase
      .from(config.targetTable)
      .select("*")
      .eq("id", targetId)
      .single()

    if (!target) {
      return res.status(404).json({ error: `${type} not found` })
    }

    const { data: owner } = await supabase
      .from("users")
      .select("is_banned")
      .eq("user_id", target[config.ownerColumn])
      .single()

    if (owner?.is_banned) {
      return res.status(400).json({ error: "cannot interact with banned user" })
    }

    if (action === "like") {
      const { error } = await supabase
        .from(config.table)
        .upsert(
          { user_id: req.user.id, [config.targetColumn]: targetId },
          { onConflict: `user_id,${config.targetColumn}` }
        )

      if (error) throw error

      if (target[config.ownerColumn] !== req.user.id && config.notificationType) {
        await createNotification({
          userId: target[config.ownerColumn],
          type: config.notificationType,
          data: config.getNotificationData(target, req.user.id),
          dedupeKey: {
            liker_id: req.user.id,
            [`${type}_id`]: targetId
          }
        })
      }

      return res.json({ liked: true })
    }

    const { error } = await supabase
      .from(config.table)
      .delete()
      .eq("user_id", req.user.id)
      .eq(config.targetColumn, targetId)

    if (error) throw error

    return res.json({ liked: false })

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}