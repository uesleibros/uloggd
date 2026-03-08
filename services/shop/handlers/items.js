import { supabase } from "#lib/supabase-ssr.js"

export async function handleItems(req, res) {
  const { category, type, featured, limited, page = 1, limit = 50 } = req.query

  const pageNum = Number(page)
  const limitNum = Math.min(Number(limit), 100)
  const offset = (pageNum - 1) * limitNum

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
      sort_order,
      category:store_categories!inner(id, slug, name, icon)
    `, { count: "exact" })
    .eq("is_active", true)

  if (category) {
    query = query.eq("category.slug", category)
  }

  if (type) {
    query = query.eq("item_type", type)
  }

  if (featured === "true") {
    query = query.eq("is_featured", true)
  }

  if (limited === "true") {
    query = query.eq("is_limited", true)
  }

  query = query
    .order("sort_order")
    .range(offset, offset + limitNum - 1)

  const { data, count, error } = await query

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_fetch_items" })
  }

  const now = new Date()

  const items = data.map((item) => {
    const availableFrom = item.available_from ? new Date(item.available_from) : null
    const availableUntil = item.available_until ? new Date(item.available_until) : null

    let isAvailable = true
    if (availableFrom && now < availableFrom) isAvailable = false
    if (availableUntil && now > availableUntil) isAvailable = false
    if (item.current_stock !== null && item.current_stock <= 0) isAvailable = false

    return {
      ...item,
      is_available: isAvailable,
      expires_at: availableUntil && availableUntil > now ? item.available_until : null,
    }
  })

  return res.json({
    items,
    total: count,
    page: pageNum,
    totalPages: Math.ceil(count / limitNum),
  })
}