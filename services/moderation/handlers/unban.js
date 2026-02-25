import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"

export async function handleUnban(req, res) {
  const { userId } = req.body
  const moderatorId = req.user.id

  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const { data: moderator } = await supabase
      .from("users")
      .select("is_moderator")
      .eq("user_id", moderatorId)
      .single()

    if (!moderator?.is_moderator) {
      return res.status(403).json({ error: "forbidden" })
    }

    const { data: targetUser } = await supabase
      .from("users")
      .select("user_id, is_banned")
      .eq("user_id", userId)
      .single()

    if (!targetUser) {
      return res.status(404).json({ error: "user not found" })
    }

    if (!targetUser.is_banned) {
      return res.status(400).json({ error: "user not banned" })
    }

    await supabase
      .from("bans")
      .update({
        unbanned_at: new Date().toISOString(),
        unbanned_by: moderatorId
      })
      .eq("user_id", userId)
      .is("unbanned_at", null)

    await supabase
      .from("users")
      .update({ is_banned: false })
      .eq("user_id", userId)

    await createNotification({
      userId,
      type: "account_unbanned",
      data: { unbanned_by: moderatorId }
    })

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}