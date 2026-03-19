import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handleFriendsReviews(req, res) {
  const userId = req.user.id
  const { sortBy = "recent", page = 1, limit = 10 } = req.query

  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(20, Math.max(1, Number(limit)))
  const offset = (pageNum - 1) * limitNum

  const cacheKey = `home_friends_reviews_${userId}_${sortBy}_${pageNum}_${limitNum}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: following, error: followError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)

    if (followError) throw followError

    if (!following || following.length === 0) {
      return res.json({
        reviews: [],
        users: {},
        games: {},
        journeys: {},
        total: 0,
        page: pageNum,
        totalPages: 0,
        message: "no_friends",
      })
    }

    const friendIds = following.map((f) => f.following_id)

    let q = supabase
      .from("reviews")
      .select("*", { count: "exact" })
      .in("user_id", friendIds)
      .not("rating", "is", null)
      .range(offset, offset + limitNum - 1)

    if (sortBy === "popular") {
      q = q.order("created_at", { ascending: false })
    } else if (sortBy === "rating") {
      q = q
        .order("rating", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    } else {
      q = q.order("created_at", { ascending: false })
    }

    const { data: reviews, count, error: reviewsError } = await q

    if (reviewsError) throw reviewsError

    if (!reviews || reviews.length === 0) {
      return res.json({
        reviews: [],
        users: {},
        games: {},
        journeys: {},
        total: 0,
        page: pageNum,
        totalPages: 0,
        message: "no_reviews",
      })
    }

    const userIds = [...new Set(reviews.map((r) => r.user_id))]
    const gameIds = [...new Set(reviews.map((r) => r.game_id))]
    const journeyIds = [...new Set(reviews.map((r) => r.journey_id).filter(Boolean))]

    const [usersResult, gamesData, journeysResult] = await Promise.all([
      supabase
        .from("users")
        .select(`
          user_id,
          username,
          avatar,
          user_badges(badge_id),
          user_equipped_items(
            slot,
            user_inventory(
              store_items(asset_url, item_type)
            )
          )
        `)
        .in("user_id", userIds),

      gameIds.length > 0
        ? query(
            "games",
            `fields id, name, slug, cover.url, cover.image_id; where id = (${gameIds.join(",")}); limit ${gameIds.length};`
          )
        : [],

      journeyIds.length > 0
        ? supabase
            .from("journeys")
            .select(`
              id,
              title,
              platform_id,
              journey_entries(id, played_on, hours, minutes)
            `)
            .in("id", journeyIds)
        : { data: [] },
    ])

    const users = {}
    if (usersResult.data) {
      for (const u of usersResult.data) {
        const equipped = {}
        if (u.user_equipped_items) {
          for (const eq of u.user_equipped_items) {
            const item = eq.user_inventory?.store_items
            if (item) {
              equipped[eq.slot] = { asset_url: item.asset_url }
            }
          }
        }

        users[u.user_id] = {
          user_id: u.user_id,
          username: u.username,
          avatar: u.avatar,
          badges: u.user_badges?.map((b) => b.badge_id) || [],
          equipped,
        }
      }
    }

    const games = {}
    if (gamesData) {
      for (const g of gamesData) {
        games[g.id] = {
          id: g.id,
          name: g.name,
          slug: g.slug,
          cover: g.cover
            ? {
                url: g.cover.url?.replace("t_thumb", "t_cover_big"),
                image_id: g.cover.image_id,
              }
            : null,
        }
      }
    }

    const journeys = {}
    if (journeysResult.data) {
      for (const j of journeysResult.data) {
        const entries = j.journey_entries || []
        const totalMinutes = entries.reduce(
          (acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0),
          0
        )
        const sortedDates = entries.map((e) => e.played_on).sort()

        journeys[j.id] = {
          id: j.id,
          title: j.title,
          platform_id: j.platform_id,
          total_sessions: entries.length,
          total_minutes: totalMinutes,
          first_session: sortedDates[0] || null,
          last_session: sortedDates[sortedDates.length - 1] || null,
        }
      }
    }

    const response = {
      reviews,
      users,
      games,
      journeys,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    }

    await setCache(cacheKey, response, 120)

    res.json(response)
  } catch (e) {
    console.error("friendsReviews error:", e)
    res.status(500).json({ error: "fail" })
  }
}
