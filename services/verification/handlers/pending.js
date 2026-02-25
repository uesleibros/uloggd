import { supabase } from "#lib/supabase-ssr.js"

export async function handlePending(req, res) {
  const reviewerId = req.user.id

  try {
    const { data: reviewer } = await supabase
      .from("users")
      .select("is_moderator")
      .eq("user_id", reviewerId)
      .single()

    if (!reviewer?.is_moderator) {
      return res.status(403).json({ error: "forbidden" })
    }

    const { data, error } = await supabase
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

    if (error) throw error

    const userIds = data.map(r => r.user_id)
    
    let users = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds)

      usersData?.forEach(u => {
        users[u.user_id] = u
      })
    }

    const requests = data.map(r => ({
      ...r,
      users: users[r.user_id] || null
    }))

    res.json({ requests })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
