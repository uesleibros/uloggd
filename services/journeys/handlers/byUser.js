import { supabase } from "#lib/supabase-ssr.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleListByUser(req, res) {
  const { username, userId, page = 1, limit = 20 } = req.query

  if (!username && !userId)
    return res.status(400).json({ error: "missing username or userId" })

  const pageNum = Number(page)
  const limitNum = Math.min(Number(limit), 50)
  const offset = (pageNum - 1) * limitNum

  try {
    let user

    if (userId) {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, avatar")
        .eq("id", userId)
        .single()

      if (error || !data) return res.status(404).json({ error: "user not found" })
      user = data
    } else {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, avatar")
        .eq("username", username)
        .single()

      if (error || !data) return res.status(404).json({ error: "user not found" })
      user = data
    }

    const { data, error, count } = await supabase
      .from("journeys")
      .select(`
        id, title, game_id, game_slug, platform_id,
        started_at, finished_at, created_at, updated_at,
        journey_entries( hours, minutes, played_on )
      `, { count: "exact" })
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (error) throw error

    const journeys = (data || []).map(j => {
      const entries = j.journey_entries || []
      const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)
      const sorted = [...entries].sort((a, b) => a.played_on.localeCompare(b.played_on))

      return {
        id: j.id,
        title: j.title,
        game_id: j.game_id,
        game_slug: j.game_slug,
        platform_id: j.platform_id,
        started_at: j.started_at,
        finished_at: j.finished_at,
        created_at: j.created_at,
        updated_at: j.updated_at,
        total_sessions: entries.length,
        total_minutes: totalMinutes,
        first_session: sorted[0]?.played_on || null,
        last_session: sorted[sorted.length - 1]?.played_on || null,
      }
    })

    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || DEFAULT_AVATAR_URL,
      },
      journeys,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
