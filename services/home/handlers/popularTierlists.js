import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

function buildTiersPreview(tiers) {
  if (!tiers || !Array.isArray(tiers)) return []
  
  return tiers.slice(0, 4).map((tier) => ({
    id: tier.id,
    label: tier.label,
    color: tier.color,
    items: (tier.items || []).slice(0, 6).map((item) => ({
      id: item.id,
      game_slug: item.game_slug
    }))
  }))
}

function countGames(tiers) {
  if (!tiers || !Array.isArray(tiers)) return 0
  return tiers.reduce((acc, tier) => acc + (tier.items?.length || 0), 0)
}

export async function handlePopularTierlists(req, res) {
  const { limit = 10 } = req.query
  const limitNum = Math.min(20, Math.max(1, Number(limit)))

  const cacheKey = `home_popular_tierlists_${limitNum}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: tierlists, error } = await supabase
      .from("tierlists")
      .select(`
        id,
        title,
        description,
        tiers,
        likes_count,
        is_public,
        created_at,
        user_id,
        users!tierlists_user_id_fkey(
          user_id,
          username,
          avatar
        )
      `)
      .eq("is_public", true)
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limitNum)

    if (error) throw error

    const formatted = (tierlists || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      tiers_preview: buildTiersPreview(t.tiers),
      games_count: countGames(t.tiers),
      likes_count: t.likes_count,
      is_public: t.is_public,
      created_at: t.created_at,
      user_id: t.user_id,
      owner: t.users ? {
        user_id: t.users.user_id,
        username: t.users.username,
        avatar: t.users.avatar
      } : null
    }))

    const response = { tierlists: formatted }

    await setCache(cacheKey, response, 300)

    res.json(response)
  } catch (e) {
    console.error("popularTierlists error:", e)
    res.status(500).json({ error: "fail" })
  }
}