import { supabase } from "#lib/supabase-ssr.js"
import { LIMITS } from "#services/journeys/constants.js"

export async function handleList(req, res) {
  const gameId = req.query.gameId ? Number(req.query.gameId) : null
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(LIMITS.MAX_JOURNEYS_PER_PAGE, Number(req.query.limit) || 20)
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from("journeys")
      .select(`
        *,
        journey_entries(count)
      `, { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (gameId) {
      query = query.eq("game_id", gameId)
    }

    const { data, error, count } = await query

    if (error) throw error

    res.json({
      journeys: data,
      total: count,
      page,
      limit,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
