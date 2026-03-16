import { supabase } from "#lib/supabase-ssr.js"

export async function handleBatch(req, res) {
  const ids = req.query.ids || []
  const idList = Array.isArray(ids) ? ids : [ids]

  if (idList.length === 0) return res.json([])

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, game_slug, game_name")
      .in("id", idList)

    if (error) throw error

    res.json(data || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}