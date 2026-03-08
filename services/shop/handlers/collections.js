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

  if (collectionIds.length === 0) {
    return res.json({ collections: [] })
  }

  const { data: collectionItems, error: itemsError } = await supabase
    .from("store_collection_items")
    .select(`
      collection_id,
      sort_order,
      item:store_items!inner(
        id,
        slug,
        name,
        description,
        asset_url,
        item_type,
        price_copper,
        price_iron,
        price_gold,
        price_emerald,
        price_diamond,
        price_ruby,
        is_active,
        is_featured,
        is_limited,
        current_stock,
        max_stock,
        available_from,
        available_until,
        metadata
      )
    `)
    .in("collection_id", collectionIds)
    .eq("item.is_active", true)
    .order("sort_order")

  if (itemsError) {
    console.error("Failed to fetch collection items:", itemsError)
  }

  const itemsByCollection = {}
  for (const ci of collectionItems || []) {
    if (!ci.item) continue

    const item = ci.item
    const itemAvailableFrom = item.available_from ? new Date(item.available_from) : null
    const itemAvailableUntil = item.available_until ? new Date(item.available_until) : null
    const nowDate = new Date(now)

    if (itemAvailableFrom && itemAvailableFrom > nowDate) continue

    if (itemAvailableUntil && itemAvailableUntil < nowDate) continue

    if (!itemsByCollection[ci.collection_id]) {
      itemsByCollection[ci.collection_id] = []
    }
    itemsByCollection[ci.collection_id].push(item)
  }

  const result = collections.map((c) => ({
    ...c,
    items: itemsByCollection[c.id] || [],
  }))

  if (slug) {
    return res.json({ collection: result[0] })
  }

  return res.json({ collections: result })
}