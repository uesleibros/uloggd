import { supabase } from "#lib/supabase-ssr.js"

export async function handleAdminCategories(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("store_categories")
      .select("*")
      .order("sort_order")

    if (error) return res.status(500).json({ error: "fetch_failed" })
    return res.json({ categories: data })
  }

  if (req.method === "POST") {
    const { slug, name, description, sort_order, is_active } = req.body
    if (!slug || !name) return res.status(400).json({ error: "slug_and_name_required" })

    const { data, error } = await supabase
      .from("store_categories")
      .insert({
        slug,
        name,
        description: description || null,
        sort_order: sort_order || 0,
        is_active: is_active !== false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "slug_already_exists" })
      return res.status(500).json({ error: "create_failed" })
    }

    return res.status(201).json({ category: data })
  }

  if (req.method === "PUT") {
    const { id, ...updates } = req.body
    if (!id) return res.status(400).json({ error: "id_required" })

    const { data, error } = await supabase
      .from("store_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: "update_failed" })
    return res.json({ category: data })
  }

  if (req.method === "DELETE") {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: "id_required" })

    const { error } = await supabase.from("store_categories").delete().eq("id", id)
    if (error) return res.status(500).json({ error: "delete_failed" })
    return res.json({ success: true })
  }

  return res.status(405).end()
}