import { supabase } from "#lib/supabase-ssr.js"
import { sendDiscordNotification } from "#lib/discord.js"

export async function handleRequest(req, res) {
  const { reason } = req.body
  const userId = req.user.id

  if (!reason || reason.trim().length < 10) {
    return res.status(400).json({ error: "reason too short" })
  }

  if (reason.length > 500) {
    return res.status(400).json({ error: "reason too long" })
  }

  try {
    const { data: existing } = await supabase
      .from("verification_requests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ error: "already_pending" })
    }

    const { data: hasVerified } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", "verified")
      .maybeSingle()

    if (hasVerified) {
      return res.status(400).json({ error: "already_verified" })
    }

    const { data: user } = await supabase
      .from("users")
      .select("username")
      .eq("user_id", userId)
      .single()

    const { error } = await supabase
      .from("verification_requests")
      .insert({
        user_id: userId,
        reason: reason.trim(),
        status: "pending"
      })

    if (error) throw error

    await sendDiscordNotification("verification_request", {
      userId,
      username: user?.username,
      reason: reason.trim()
    })

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
