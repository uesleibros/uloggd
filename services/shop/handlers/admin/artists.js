import { supabase } from "#lib/supabase-ssr.js"

export async function handleAdminArtists(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("shop_artists")
      .select("*")
      .order("sort_order")

    if (error) return res.status(500).json({ error: "fetch_failed" })
    return res.json({ artists: data })
  }

  if (req.method === "POST") {
    const { id, name, avatar_url, url, listed, sort_order } = req.body
    if (!id || !name) return res.status(400).json({ error: "id_and_name_required" })

    const { data, error } = await supabase
      .from("shop_artists")
      .insert({
        id,
        name,
        avatar_url: avatar_url || null,
        url: url || null,
        listed: listed !== false,
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "id_already_exists" })
      return res.status(500).json({ error: "create_failed" })
    }

    return res.status(201).json({ artist: data })
  }

  if (req.method === "PUT") {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: "id_required" })

    const { data, error } = await supabase
      .from("shop_artists")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: "update_failed" })
    return res.json({ artist: data })
  }

  if (req.method === "DELETE") {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: "id_required" })

    await supabase.from("shop_item_artists").delete().eq("artist_id", id)
    const { error } = await supabase.from("shop_artists").delete().eq("id", id)

    if (error) return res.status(500).json({ error: "delete_failed" })
    return res.json({ success: true })
  }

  return res.status(405).end()
}