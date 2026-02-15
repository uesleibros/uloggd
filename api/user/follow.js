import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "unauthorized" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "unauthorized" })

  const { followingId, action } = req.body

  if (!followingId) return res.status(400).json({ error: "missing followingId" })
  if (user.id === followingId) return res.status(400).json({ error: "cannot follow yourself" })

  try {
    if (action === "follow") {
      const { error } = await supabase
        .from("follows")
        .upsert(
          { follower_id: user.id, following_id: followingId },
          { onConflict: "follower_id,following_id" }
        )

      if (error) throw error
      return res.json({ followed: true })
    }

    if (action === "unfollow") {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followingId)

      if (error) throw error
      return res.json({ followed: false })
    }

    return res.status(400).json({ error: "invalid action" })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}