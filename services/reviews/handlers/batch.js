import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

export async function handleBatch(req, res) {
  const ids = req.query.ids || []
  const idList = Array.isArray(ids) ? ids : [ids]

  if (idList.length === 0) return res.json([])

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, game_slug, game_id")
      .in("id", idList)

    if (error) throw error
    if (!data?.length) return res.json([])

    const gameIds = [...new Set(data.map(r => r.game_id).filter(Boolean))]

    let gamesMap = {}
    if (gameIds.length > 0) {
      const games = await query(
        "games",
        `fields id, name; where id = (${gameIds.join(",")}); limit ${gameIds.length};`
      )
      games?.forEach(g => { gamesMap[g.id] = g.name })
    }

    const result = data.map(r => ({
      id: r.id,
      game_slug: r.game_slug,
      game_name: gamesMap[r.game_id] || null,
    }))

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
