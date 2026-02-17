import { supabase } from "../../../lib/supabase-ssr.js"

export async function handlePublic(req, res) {
  const { gameId, sortBy = "recent", page = 1, limit = 20 } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  const offset = (page - 1) * limit

  try {
    let q = supabase
      .from("logs")
      .select("*", { count: "exact" })
      .eq("game_id", gameId)
      .range(offset, offset + limit - 1)

    if (sortBy === "rating") {
      q = q
        .order("rating", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    } else {
      q = q.order("created_at", { ascending: false })
    }

    const { data: logs, count, error } = await q
    if (error) throw error

    const userIds = [...new Set((logs || []).map(l => l.user_id))]
    const users = {}

    if (userIds.length > 0) {
      const { data: usersData } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      })

      const { data: badgesData } = await supabase
        .from("user_badges")
        .select("user_id, badge:badges(id, title, description)")
        .in("user_id", userIds)

      const badgesMap = {}
      if (badgesData) {
        for (const row of badgesData) {
          if (!badgesMap[row.user_id]) badgesMap[row.user_id] = []
          if (row.badge) badgesMap[row.user_id].push(row.badge)
        }
      }

      if (usersData?.users) {
        for (const uid of userIds) {
          const authUser = usersData.users.find(u => u.id === uid)
          if (authUser) {
            users[uid] = {
              username: authUser.user_metadata?.full_name,
              avatar: authUser.user_metadata?.avatar_url,
              badges: badgesMap[uid] || [],
            }
          }
        }
      }
    }

    res.json({
      logs: logs || [],
      users,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch reviews" })
  }
}