import { supabase } from "#lib/supabase-ssr.js"
import { createNotification } from "#services/notifications/create.js"
import { VALID_FOLLOW_ACTIONS } from "#services/users/constants.js"

export async function handleFollow(req, res) {
  const { followingId, action } = req.body

  if (!followingId) return res.status(400).json({ error: "missing followingId" })
  if (req.user.id === followingId) return res.status(400).json({ error: "cannot follow yourself" })
  if (!VALID_FOLLOW_ACTIONS.includes(action)) return res.status(400).json({ error: "invalid action" })

  try {
    if (action === "follow") {
      const { error } = await supabase
        .from("follows")
        .upsert(
          { follower_id: req.user.id, following_id: followingId },
          { onConflict: "follower_id,following_id" }
        )

      if (error) throw error

      await createNotification({
        userId: followingId,
        type: "follow",
        data: { follower_id: req.user.id },
        dedupeKey: { follower_id: req.user.id },
      })

      return res.json({ followed: true })
    }

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", req.user.id)
      .eq("following_id", followingId)

    if (error) throw error
    res.json({ followed: false })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
