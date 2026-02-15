import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId, currentUserId } = req.body
  if (!userId) return res.status(400).json({ error: "missing userId" })

  try {
    const [followersRes, followingRes, isFollowingRes] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),

      currentUserId
        ? supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    res.json({
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
      isFollowing: !!isFollowingRes.data,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}