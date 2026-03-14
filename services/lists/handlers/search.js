import { supabase } from "#lib/supabase-ssr.js"
import { encode } from "#utils/shortId.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleSearch(req, res) {
  const { query, limit = 20, offset = 0, sort = "relevance" } = req.query

  if (!query?.trim()) return res.json({ results: [], total: 0 })

  const limitNum = Number(limit)
  const offsetNum = Number(offset)

  try {
    let q = supabase
      .from("lists")
      .select(`
        id, title, description, is_public, created_at,
        owner:user_id ( id, user_id, username, avatar ),
        list_items ( id, game_slug, position )
      `, { count: "exact" })
      .eq("is_public", true)
      .ilike("title", `%${query}%`)

    if (sort === "title") q = q.order("title", { ascending: true })
    else q = q.order("created_at", { ascending: false })

    const { data, count, error } = await q.range(offsetNum, offsetNum + limitNum - 1)
    if (error) throw error

    const results = (data || []).map(list => {
      const items = (list.list_items || []).sort((a, b) => a.position - b.position)
      return {
        id: list.id,
        shortId: encode(list.id),
        title: list.title,
        description: list.description,
        games_count: items.length,
        game_slugs: items.slice(0, 4).map(i => i.game_slug),
        owner: list.owner ? {
          id: list.owner.id,
          user_id: list.owner.user_id
          username: list.owner.username,
          avatar: list.owner.avatar || DEFAULT_AVATAR_URL,
        } : null,
        created_at: list.created_at,
      }
    })

    if (sort === "games_count") {
      results.sort((a, b) => b.games_count - a.games_count)
    }

    res.json({ results, total: count || 0 })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
