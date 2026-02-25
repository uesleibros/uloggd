import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"

export async function handleReview(req, res) {
  const { requestId, action, rejectionReason } = req.body
  const reviewerId = req.user.id

  if (!requestId || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "invalid params" })
  }

  try {
    const { data: reviewer } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", reviewerId)
      .in("badge_id", ["developer", "moderator"])
      .limit(1)
      .maybeSingle()

    if (!reviewer) {
      return res.status(403).json({ error: "forbidden" })
    }

    const { data: request } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle()

    if (!request) {
      return res.status(404).json({ error: "request not found" })
    }

    const { error: updateError } = await supabase
      .from("verification_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === "reject" ? rejectionReason || null : null
      })
      .eq("id", requestId)

    if (updateError) throw updateError

    if (action === "approve") {
      const { error: badgeError } = await supabase
        .from("user_badges")
        .insert({
          user_id: request.user_id,
          badge_id: "verified"
        })

      if (badgeError) throw badgeError

      await createNotification({
        userId: request.user_id,
        type: "verification_approved",
        data: { reviewed_by: reviewerId },
        dedupeKey: { request_id: requestId }
      })
    } else {
      await createNotification({
        userId: request.user_id,
        type: "verification_rejected",
        data: {
          reviewed_by: reviewerId,
          rejection_reason: rejectionReason || null
        },
        dedupeKey: { request_id: requestId }
      })
    }

    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
