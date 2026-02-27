import { supabase } from "#lib/supabase-ssr.js"
import { decode } from "#utils/shortId.js"
import { DEFAULT_AVATAR_URL } from "#services/users/constants.js"

export async function handleGet(req, res) {
  const { tierlistId } = req.query

  if (!tierlistId) return res.status(400).json({ error: "tierlistId required" })

  try {
    const decodedId = decode(tierlistId)
    if (!decodedId) return res.status(400).json({ error: "invalid tierlistId" })

    const { data: tierlist, error } = await supabase
      .from("tierlists")
      .select(`
        id, user_id, title, description, is_public, created_at, updated_at,
        owner:user_id ( id, username, avatar, avatar_decoration ),
        tierlist_tiers (
          id, label, color, position,
          tierlist_items ( id, game_id, game_slug, position )
        )
      `)
      .eq("id", decodedId)
      .single()

    if (error?.code === "PGRST116") return res.status(404).json({ error: "not found" })
    if (error) throw error

    if (tierlist.owner) {
      tierlist.owner.avatar = tierlist.owner.avatar || DEFAULT_AVATAR_URL
    }

    const { data: userGames } = await supabase
      .from("user_games")
      .select("game_slug")
      .eq("user_id", tierlist.user_id)

    const validSlugs = new Set(userGames?.map(g => g.game_slug) || [])

    const filteredTiers = (tierlist.tierlist_tiers || [])
      .sort((a, b) => a.position - b.position)
      .map(tier => ({
        ...tier,
        tierlist_items: (tier.tierlist_items || [])
          .filter(item => validSlugs.has(item.game_slug))
          .sort((a, b) => a.position - b.position)
      }))

    const allItems = (tierlist.tierlist_tiers || []).flatMap(t => t.tierlist_items || [])
    const orphanIds = allItems
      .filter(item => !validSlugs.has(item.game_slug))
      .map(item => item.id)

    if (orphanIds.length > 0) {
      supabase
        .from("tierlist_items")
        .delete()
        .in("id", orphanIds)
        .then(() => console.log(`Cleaned ${orphanIds.length} orphan tierlist items`))
    }

    return res.json({
      ...tierlist,
      tierlist_tiers: filteredTiers,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: "fail" })
  }
}