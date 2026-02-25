import { supabase } from "#lib/supabase-ssr.js"

export async function handlePending(req, res) {
  const reviewerId = req.user.id
  const { userId } = req.body

  try {
    const { data: reviewer } = await supabase
      .from("users")
      .select("is_moderator")
      .eq("user_id", reviewerId)
      .single()

    if (!reviewer?.is_moderator) {
      return res.status(403).json({ error: "forbidden" })
    }

    let query = supabase
      .from("verification_requests")
      .select(`
        id,
        reason,
        status,
        created_at,
        user_id
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error

    res.json({ request: userId ? (data?.[0] || null) : null, requests: userId ? null : data })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
