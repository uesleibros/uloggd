import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"
import { sendDiscordNotification } from "#lib/discord.js"

export async function handleBan(req, res) {
  const { userId, reason, deleteContent } = req.body
  const moderatorId = req.user.id

  if (!userId) return res.status(400).json({ error: "userId required" })
  if (!reason?.trim()) return res.status(400).json({ error: "reason required" })

  try {
    const { data: moderator } = await supabase
      .from("users")
      .select("is_moderator, username")
      .eq("user_id", moderatorId)
      .single()

    if (!moderator?.is_moderator) {
      return res.status(403).json({ error: "forbidden" })
    }

    const { data: targetUser } = await supabase
      .from("users")
      .select("user_id, username, is_moderator, is_banned")
      .eq("user_id", userId)
      .single()

    if (!targetUser) {
      return res.status(404).json({ error: "user not found" })
    }

    if (targetUser.is_moderator) {
      return res.status(400).json({ error: "cannot ban moderator" })
    }

    if (targetUser.user_id === moderatorId) {
      return res.status(400).json({ error: "cannot ban yourself" })
    }

    if (targetUser.is_banned) {
      return res.status(400).json({ error: "user already banned" })
    }

    const { error: banError } = await supabase
      .from("bans")
      .insert({
        user_id: userId,
        banned_by: moderatorId,
        reason: reason.trim(),
        delete_content: deleteContent || false
      })

    if (banError) throw banError

    const { error: updateError } = await supabase
      .from("users")
      .update({ is_banned: true })
      .eq("user_id", userId)

    if (updateError) throw updateError

    if (deleteContent) {
      await supabase.from("reviews").delete().eq("user_id", userId)
    }

    await createNotification({
      userId,
      type: "account_banned",
      data: {
        reason: reason.trim(),
        banned_by: moderatorId
      }
    })

    await sendDiscordNotification("user_banned", {
      username: targetUser.username,
      moderatorUsername: moderator.username,
      reason: reason.trim()
    })

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}