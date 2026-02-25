import { supabase } from "#lib/supabase-ssr.js"

export async function handleList(req, res) {
  const moderatorId = req.user.id

  try {
    const { data: moderator } = await supabase
      .from("users")
      .select("is_moderator")
      .eq("user_id", moderatorId)
      .single()

    if (!moderator?.is_moderator) {
      return res.status(403).json({ error: "forbidden" })
    }

    const { data, error } = await supabase
      .from("bans")
      .select("*")
      .is("unbanned_at", null)
      .order("created_at", { ascending: false })

    if (error) throw error

    const userIds = [...new Set([
      ...data.map(b => b.user_id),
      ...data.map(b => b.banned_by)
    ])]

    let users = {}
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds)

      usersData?.forEach(u => {
        users[u.user_id] = u
      })
    }

    const bans = data.map(b => ({
      ...b,
      user: users[b.user_id] || null,
      banned_by_user: users[b.banned_by] || null
    }))

    res.json({ bans })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}