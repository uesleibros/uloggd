import { supabase } from "#lib/supabase-ssr.js"

export async function handleArtists(req, res) {
  const { id, listed = "true", includeItems = "false" } = req.query
  const now = new Date().toISOString()

  let query = supabase
    .from("shop_artists")
    .select(`
      id,
      name,
      avatar_url,
      url,
      listed,
      sort_order
    `)
    .order("sort_order")
    .order("name")

  if (listed !== "all") {
    query = query.eq("listed", listed === "true")
  }

  if (id) {
    query = query.eq("id", id)
  }

  const { data: artists, error } = await query

  if (error) {
    console.error(error)
    return res.status(500).json({ error: "failed_to_fetch_artists" })
  }

  if (id && artists.length === 0) {
    return res.status(404).json({ error: "artist_not_found" })
  }

  if (includeItems !== "true") {
    if (id) {
      return res.json({ artist: artists[0] })
    }

    return res.json({ artists })
  }

  const artistIds = artists.map(artist => artist.id)

  if (artistIds.length === 0) {
    if (id) {
      return res.json({ artist: null })
    }

    return res.json({ artists: [] })
  }

  const { data: artistItems, error: itemsError } = await supabase
    .from("shop_item_artists")
    .select(`
      artist_id,
      is_primary,
      item:store_items!inner(
        id,
        slug,
        name,
        description,
        asset_url,
        item_type,
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
    .in("artist_id", artistIds)
    .eq("item.is_active", true)

  if (itemsError) {
    console.error("Failed to fetch artist items:", itemsError)
  }

  const itemsByArtist = {}
  const nowDate = new Date(now)

  for (const entry of artistItems || []) {
    if (!entry.item) continue

    const item = entry.item
    const itemAvailableFrom = item.available_from ? new Date(item.available_from) : null
    const itemAvailableUntil = item.available_until ? new Date(item.available_until) : null

    if (itemAvailableFrom && itemAvailableFrom > nowDate) continue
    if (itemAvailableUntil && itemAvailableUntil < nowDate) continue

    if (!itemsByArtist[entry.artist_id]) {
      itemsByArtist[entry.artist_id] = []
    }

    itemsByArtist[entry.artist_id].push({
      ...item,
      is_primary_artist: entry.is_primary,
    })
  }

  const result = artists.map(artist => ({
    ...artist,
    items: (itemsByArtist[artist.id] || []).sort(
      (a, b) => Number(b.is_primary_artist) - Number(a.is_primary_artist)
    ),
  }))

  if (id) {
    return res.json({ artist: result[0] })
  }

  return res.json({ artists: result })
}