import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

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
        slug,
        tiers,
        likes_count,
        created_at,
        user_id,
        users!tierlists_user_id_fkey(
          user_id,
          username,
          avatar
        )
      `)
      .eq("visibility", "public")
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limitNum)

    if (error) throw error

    const formatted = (tierlists || []).map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      tiers: t.tiers,
      likes_count: t.likes_count,
      created_at: t.created_at,
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