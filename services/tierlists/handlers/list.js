import { supabase } from "#lib/supabase-ssr.js"

export async function handleList(req, res) {
  const { userId, page = 1, limit = 12 } = req.query

  if (!userId) return res.status(400).json({ error: "userId required" })

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  try {
    const { data, error, count } = await supabase
      .from("tierlists")
      .select(`
        id, title, description, is_public, created_at, updated_at,
        tierlist_tiers ( id, label, color, position, tierlist_items ( id ) )
      `, { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (error) throw error

    const tierlists = (data || []).map(t => {
      const sortedTiers = (t.tierlist_tiers || []).sort((a, b) => a.position - b.position)
      const gamesCount = sortedTiers.reduce((acc, tier) => acc + (tier.tierlist_items?.length || 0), 0)

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        is_public: t.is_public,
        created_at: t.created_at,
        updated_at: t.updated_at,
        games_count: gamesCount,
        tiers_preview: sortedTiers.slice(0, 6).map(tier => ({
          id: tier.id,
          label: tier.label,
          color: tier.color,
        })),
      }
    })

    res.json({
      tierlists,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}