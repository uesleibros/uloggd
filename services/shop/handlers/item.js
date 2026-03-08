import { supabase } from "#lib/supabase-ssr.js"

export async function handleItem(req, res) {
  const { slug, id } = req.query

  if (!slug && !id) {
    return res.status(400).json({ error: "missing_slug_or_id" })
  }

  let query = supabase
    .from("store_items")
    .select(`
      id,
      slug,
      name,
      description,
      preview_url,
      asset_url,
      item_type,
      price_copper,
      price_iron,
      price_gold,
      price_emerald,
      price_diamond,
      price_ruby,
      is_featured,
      is_limited,
      max_stock,
      current_stock,
      available_from,
      available_until,
      metadata,
      category:store_categories!inner(id, slug, name, icon)
    `)
    .eq("is_active", true)

  if (slug) {
    query = query.eq("slug", slug)
  } else {
    query = query.eq("id", Number(id))
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return res.status(404).json({ error: "item_not_found" })
  }

  const now = new Date()
  const availableFrom = data.available_from ? new Date(data.available_from) : null
  const availableUntil = data.available_until ? new Date(data.available_until) : null

  let isAvailable = true
  if (availableFrom && now < availableFrom) isAvailable = false
  if (availableUntil && now > availableUntil) isAvailable = false
  if (data.current_stock !== null && data.current_stock <= 0) isAvailable = false

  return res.json({
    item: {
      ...data,
      is_available: isAvailable,
      expires_at: availableUntil && availableUntil > now ? data.available_until : null,
    },
  })
}