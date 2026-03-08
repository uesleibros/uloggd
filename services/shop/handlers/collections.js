import { supabase } from "#lib/supabase-ssr.js"

export async function handleCollections(req, res) {
  const { slug } = req.query

  const now = new Date().toISOString()

  let query = supabase
    .from("store_collections")
    .select(`
      id,
      slug,
      name,
      description,
      banner_url,
      accent_color,
      is_featured,
      available_from,
      available_until,
      sort_order
    `)
    .eq("is_active", true)
    .or(`available_from.is.null,available_from.lte.${now}`)
    .or(`available_until.is.null,available_until.gte.${now}`)
    .order("sort_order")

  if (slug) {
    query = query.eq("slug", slug)
  }

  const { data: collections, error } = await query

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_fetch_collections" })
  }

  if (slug && collections.length === 0) {
    return res.status(404).json({ error: "collection_not_found" })
  }

  const collectionIds = collections.map((c) => c.id)

  const { data: collectionItems } = await supabase
    .from("store_collection_items")
    .select(`
      collection_id,
      sort_order,
      item:store_items!inner(
        id,
        slug,
        name,
        description,
        preview_url,
        item_type,
        price_copper,
        price_iron,
        price_gold,
        price_emerald,
        price_diamond,
        price_ruby,
        is_featured,
        is_limited,
        current_stock,
        max_stock,
        available_until,
        metadata
      )
    `)
    .in("collection_id", collectionIds)
    .eq("item.is_active", true)
    .order("sort_order")

  const itemsByCollection = {}
  for (const ci of collectionItems || []) {
    if (!itemsByCollection[ci.collection_id]) {
      itemsByCollection[ci.collection_id] = []
    }
    itemsByCollection[ci.collection_id].push(ci.item)
  }

  const result = collections.map((c) => ({
    ...c,
    expires_at: c.available_until && new Date(c.available_until) > new Date() ? c.available_until : null,
    items: itemsByCollection[c.id] || [],
  }))

  if (slug) {
    return res.json({ collection: result[0] })
  }

  return res.json({ collections: result })
}