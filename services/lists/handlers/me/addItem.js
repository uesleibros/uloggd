import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const MAX_ITEMS = 500
const MAX_NOTE = 200

export async function handleAddItem(req, res) {
  const { listId, gameId, gameSlug, note } = req.body

  if (!listId || !gameId || !gameSlug)
    return res.status(400).json({ error: "missing fields" })

  try {
    const games = await query(
      "games",
      `fields id; where id = ${Math.floor(gameId)}; limit 1;`
    )
    if (!games.length)
      return res.status(404).json({ error: "game not found" })
  } catch (e) {
    console.error(e)
    return res.status(502).json({ error: "fail to validate game" })
  }

  try {
    const { data: list } = await supabase
      .from("lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", req.user.id)
      .single()

    if (!list) return res.status(404).json({ error: "list not found" })

    const { count } = await supabase
      .from("list_items")
      .select("*", { count: "exact", head: true })
      .eq("list_id", listId)

    if (count >= MAX_ITEMS)
      return res.status(400).json({ error: `max ${MAX_ITEMS} items` })

    const { data, error } = await supabase
      .from("list_items")
      .insert({
        list_id: listId,
        game_id: gameId,
        game_slug: gameSlug,
        position: count,
        note: note?.trim().slice(0, MAX_NOTE) || null,
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}