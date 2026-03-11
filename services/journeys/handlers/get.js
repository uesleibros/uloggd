import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

async function getGameBySlug(slug) {
  if (!slug) return null

  const cacheKey = `igdb_game_mini_${slug}`
  const cached = await getCache(cacheKey)
  if (cached) return cached

  try {
    const data = await query("games", `
      fields name, slug, cover.url, cover.image_id;
      where slug = "${slug}";
      limit 1;
    `)

    if (!data.length) return null

    const g = data[0]
    const result = {
      id: g.id,
      name: g.name,
      slug: g.slug,
      cover_url: g.cover?.url?.replace("t_thumb", "t_cover_big") || null,
    }

    await setCache(cacheKey, result, 86400)
    return result
  } catch {
    return null
  }
}

export async function handleGet(req, res) {
  const { journeyId } = req.query
  if (!journeyId) return res.status(400).json({ error: "missing journeyId" })

  try {
    const { data: journey, error } = await supabase
      .from("journeys")
      .select(`
        id, user_id, title, game_id, game_slug, platform_id,
        started_at, finished_at, created_at, updated_at,
        journey_entries( id, played_on, hours, minutes, note )
      `)
      .eq("id", journeyId)
      .single()

    if (error || !journey) return res.status(404).json({ error: "not found" })

    const { data: user } = await supabase
      .from("users")
      .select("user_id, username, avatar")
      .eq("user_id", journey.user_id)
      .single()

    const game = await getGameBySlug(journey.game_slug)

    const entries = journey.journey_entries || []
    const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)

    res.json({
      ...journey,
      entries: entries.sort((a, b) => a.played_on.localeCompare(b.played_on)),
      users: user ? {
        user_id: user.user_id,
        username: user.username,
        avatar: user.avatar || DEFAULT_AVATAR_URL,
      } : null,
      games: game,
      stats: {
        total_sessions: entries.length,
        total_minutes: totalMinutes,
        total_hours: Math.floor(totalMinutes / 60),
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
