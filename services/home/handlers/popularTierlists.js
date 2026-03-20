import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handlePopularTierlists(req, res) {
  const { limit = 10 } = req.query
  const limitNum = Math.min(20, Math.max(1, Number(limit)))

  const cacheKey = `home_popular_tierlists_${limitNum}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: tierlistLikes, error: likesError } = await supabase
      .from("tierlist_likes")
      .select("tierlist_id")
    
    if (likesError) throw likesError

    const likesCount = {}
    for (const like of tierlistLikes || []) {
      likesCount[like.tierlist_id] = (likesCount[like.tierlist_id] || 0) + 1
    }

    const { data: tierlists, error } = await supabase
      .from("tierlists")
      .select(`
        id,
        title,
        description,
        is_public,
        created_at,
        user_id,
        users!tierlists_user_id_fkey(
          user_id,
          username,
          avatar
        ),
        tierlist_tiers(
          id,
          label,
          color,
          position,
          tierlist_items(
            id,
            game_id,
            game_slug,
            position
          )
        )
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    const withLikes = (tierlists || []).map((t) => ({
      ...t,
      likes_count: likesCount[t.id] || 0
    }))

    withLikes.sort((a, b) => {
      if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count
      return new Date(b.created_at) - new Date(a.created_at)
    })

    const topTierlists = withLikes.slice(0, limitNum)

    const formatted = topTierlists.map((t) => {
      const sortedTiers = (t.tierlist_tiers || [])
        .sort((a, b) => a.position - b.position)
        .slice(0, 4)

      const tiersPreview = sortedTiers.map((tier) => ({
        id: tier.id,
        label: tier.label,
        color: tier.color,
        items: (tier.tierlist_items || [])
          .sort((a, b) => a.position - b.position)
          .slice(0, 6)
          .map((item) => ({
            id: item.id,
            game_slug: item.game_slug
          }))
      }))

      const gamesCount = (t.tierlist_tiers || []).reduce(
        (acc, tier) => acc + (tier.tierlist_items?.length || 0),
        0
      )

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        tiers_preview: tiersPreview,
        games_count: gamesCount,
        likes_count: t.likes_count,
        is_public: t.is_public,
        created_at: t.created_at,
        user_id: t.user_id,
        owner: t.users ? {
          user_id: t.users.user_id,
          username: t.users.username,
          avatar: t.users.avatar
        } : null
      }
    })

    const response = { tierlists: formatted }

    await setCache(cacheKey, response, 300)

    res.json(response)
  } catch (e) {
    console.error("popularTierlists error:", e)
    res.status(500).json({ error: "fail" })
  }
}