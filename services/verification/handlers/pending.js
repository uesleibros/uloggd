import { supabase } from "#lib/supabase-ssr.js"

export async function handlePending(req, res) {
  const reviewerId = req.user.id

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

    const { data, error } = await supabase
      .from("verification_requests")
      .select(`
        id,
        reason,
        status,
        created_at,
        user_id,
        users:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (error) throw error

    res.json({ requests: data || [] })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
