import { supabase } from "#lib/supabase-ssr.js"

export async function handleGet(req, res) {
  const { listId, userId } = req.body
  if (!listId && !userId) return res.status(400).json({ error: "missing listId or userId" })

  try {
    if (listId) {
      const { data, error } = await supabase
        .from("lists")
        .select(`
          *,
          list_items ( id, game_id, game_slug, position, note, added_at ),
          owner:user_id ( id, username, avatar, avatar_decoration )
        `)
        .eq("id", listId)
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: "list not found" })

      if (data.list_items) {
        data.list_items.sort((a, b) => a.position - b.position)
      }

      res.json(data)
    } else {
      const { data, error } = await supabase
        .from("lists")
        .select(`
          id, title, description, is_public, created_at, updated_at,
          list_items ( id, game_slug, position )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const lists = (data || []).map(list => {
        const items = (list.list_items || []).sort((a, b) => a.position - b.position)
        return {
          ...list,
          games_count: items.length,
          game_slugs: items.slice(0, 4).map(i => i.game_slug),
        }
      })

      res.json(lists)
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}