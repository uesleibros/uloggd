import { supabase } from "#lib/supabase-ssr.js"

export async function handleAdminItems(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("store_items")
      .select(`
        *,
        category:store_categories(id, name, slug),
        artists:shop_item_artists(
          is_primary,
          artist:shop_artists(id, name, avatar_url, url)
        )
      `)
      .order("sort_order")

    if (error) return res.status(500).json({ error: "fetch_failed" })
    return res.json({ items: data })
  }

  if (req.method === "POST") {
    const {
      category_id, slug, name, description, asset_url, item_type,
      price_copper, price_iron, price_gold, price_emerald, price_diamond, price_ruby,
      is_active, is_featured, is_limited, max_stock, current_stock,
      available_from, available_until, metadata, sort_order, artist_ids,
    } = req.body

    if (!category_id || !slug || !name || !item_type) {
      return res.status(400).json({ error: "missing_required_fields" })
    }

    const { data: item, error } = await supabase
      .from("store_items")
      .insert({
        category_id,
        slug,
        name,
        description: description || null,
        asset_url: asset_url || null,
        item_type,
        price_copper: price_copper || 0,
        price_iron: price_iron || 0,
        price_gold: price_gold || 0,
        price_emerald: price_emerald || 0,
        price_diamond: price_diamond || 0,
        price_ruby: price_ruby || 0,
        is_active: is_active !== false,
        is_featured: is_featured || false,
        is_limited: is_limited || false,
        max_stock: max_stock || null,
        current_stock: current_stock || null,
        available_from: available_from || null,
        available_until: available_until || null,
        metadata: metadata || {},
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "slug_already_exists" })
      return res.status(500).json({ error: "create_failed" })
    }

    if (artist_ids?.length) {
      const rows = artist_ids.map((aid, i) => ({
        item_id: item.id,
        artist_id: aid,
        is_primary: i === 0,
      }))
      await supabase.from("shop_item_artists").insert(rows)
    }

    return res.status(201).json({ item })
  }

  if (req.method === "PUT") {
    const { id, artist_ids, ...updates } = req.body
    if (!id) return res.status(400).json({ error: "id_required" })

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("store_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: "update_failed" })

    if (artist_ids !== undefined) {
      await supabase.from("shop_item_artists").delete().eq("item_id", id)
      if (artist_ids.length) {
        const rows = artist_ids.map((aid, i) => ({
          item_id: id,
          artist_id: aid,
          is_primary: i === 0,
        }))
        await supabase.from("shop_item_artists").insert(rows)
      }
    }

    return res.json({ item: data })
  }

  if (req.method === "DELETE") {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: "id_required" })

    await supabase.from("shop_item_artists").delete().eq("item_id", id)
    await supabase.from("store_collection_items").delete().eq("item_id", id)
    const { error } = await supabase.from("store_items").delete().eq("id", id)

    if (error) return res.status(500).json({ error: "delete_failed" })
    return res.json({ success: true })
  }

  return res.status(405).end()
}