import { supabase } from "#lib/supabase-ssr.js"

export async function handleCategories(req, res) {
  const { data, error } = await supabase
    .from("store_categories")
    .select("id, slug, name, description, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order")

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_fetch_categories" })
  }

  return res.json({ categories: data })
}