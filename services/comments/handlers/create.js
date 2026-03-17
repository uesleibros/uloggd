import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"
import { getCommentConfig } from "../config.js"

export async function handleCreate(req, res) {
  const { type, targetId, content, parentId } = req.body

  const config = getCommentConfig(type)
  if (!config) return res.status(400).json({ error: "invalid type" })
  if (!targetId) return res.status(400).json({ error: "missing targetId" })
  if (!content?.trim()) return res.status(400).json({ error: "missing content" })
  if (content.trim().length > 2000) return res.status(400).json({ error: "content too long" })

  try {
    const { data: target } = await supabase
      .from(config.targetTable)
      .select(config.ownerColumn)
      .eq(config.targetColumn, targetId)
      .single()

    if (!target) return res.status(404).json({ error: `${type} not found` })

    const ownerId = target[config.ownerColumn]

    const { data: owner } = await supabase
      .from("users")
      .select("is_banned")
      .eq("user_id", ownerId)
      .single()

    if (owner?.is_banned) {
      return res.status(400).json({ error: "cannot interact with banned user" })
    }

    let parentComment = null
    if (parentId) {
      const { data: parent } = await supabase
        .from("comments")
        .select("id, user_id, target_type, target_id")
        .eq("id", parentId)
        .single()

      if (!parent) return res.status(404).json({ error: "parent comment not found" })
      if (parent.target_type !== type || parent.target_id !== String(targetId)) {
        return res.status(400).json({ error: "parent comment does not belong to this target" })
      }

      parentComment = parent
    }

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        user_id: req.user.id,
        target_type: type,
        target_id: String(targetId),
        content: content.trim(),
        parent_id: parentId || null
      })
      .select("id, created_at")
      .single()

    if (error) throw error

    if (ownerId !== req.user.id) {
      await createNotification({
        userId: ownerId,
        type: config.notificationType,
        data: config.getNotificationData(targetId, req.user.id, comment.id),
        dedupeKey: {
          commenter_id: req.user.id,
          [`${type}_id`]: targetId,
          comment_id: comment.id
        }
      })
    }

    if (parentComment && parentComment.user_id !== req.user.id && parentComment.user_id !== ownerId) {
      await createNotification({
        userId: parentComment.user_id,
        type: "comment_reply",
        data: {
          target_type: type,
          target_id: targetId,
          comment_id: comment.id,
          parent_comment_id: parentId,
          replier_id: req.user.id
        },
        dedupeKey: {
          replier_id: req.user.id,
          parent_comment_id: parentId,
          comment_id: comment.id
        }
      })
    }

    res.json({ id: comment.id, created_at: comment.created_at })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
