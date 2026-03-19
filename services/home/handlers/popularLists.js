import { supabase } from "#lib/supabase-ssr.js"
import { getCache, setCache } from "#lib/cache.js"
import { encode } from "#utils/shortId.js"

export async function handlePopularLists(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 10, 20)

  const cacheKey = `home_popular_lists_${limit}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: likeCounts, error: likeError } = await supabase
      .from("list_likes")
      .select("list_id")

    if (likeError) throw likeError

    if (!likeCounts || likeCounts.length === 0) {
      return res.json({ lists: [] })
    }

    const countMap = {}
    for (const like of likeCounts) {
      countMap[like.list_id] = (countMap[like.list_id] || 0) + 1
    }

    const topListIds = Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id)

    const { data: lists, error: listsError } = await supabase
      .from("lists")
      .select(`
        id,
        user_id,
        title,
        description,
        is_public,
        ranked,
        updated_at,
        list_items(game_slug, position)
      `)
      .in("id", topListIds)
      .eq("is_public", true)

    if (listsError) throw listsError

    if (!lists || lists.length === 0) {
      return res.json({ lists: [] })
    }

    const ownerIds = [...new Set(lists.map((l) => l.user_id))]

    const { data: owners } = await supabase
      .from("users")
      .select("user_id, username, avatar")
      .in("user_id", ownerIds)

    const ownersMap = {}
    if (owners) {
      for (const o of owners) {
        ownersMap[o.user_id] = o
      }
    }

    const result = lists
      .map((list) => {
        const items = (list.list_items || [])
          .sort((a, b) => a.position - b.position)

        return {
          id: list.id,
          shortId: encode(list.id),
          user_id: list.user_id,
          title: list.title,
          description: list.description,
          is_public: list.is_public,
          ranked: list.ranked,
          updated_at: list.updated_at,
          games_count: items.length,
          likes_count: countMap[list.id] || 0,
          game_slugs: items.slice(0, 5).map((i) => i.game_slug),
          owner: ownersMap[list.user_id] || null,
        }
      })
      .sort((a, b) => b.likes_count - a.likes_count)

    const response = { lists: result }

    await setCache(cacheKey, response, 300)

    res.json(response)
  } catch (e) {
    console.error("popularLists error:", e)
    res.status(500).json({ error: "fail" })
  }
}
