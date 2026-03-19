import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handleFriendsReviews(req, res) {
  const userId = req.user.id
  const { sortBy = "recent", limit = 12 } = req.query

  const limitNum = Math.min(20, Math.max(1, Number(limit)))

  const cacheKey = `home_friends_reviews_${userId}_${sortBy}_${limitNum}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: following, error: followError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)

    if (followError) throw followError

    if (!following || following.length === 0) {
      return res.json({ reviews: [], users: {}, games: {}, message: "no_friends" })
    }

    const friendIds = following.map((f) => f.following_id)

    const fetchMultiple = limitNum * 4

    let q = supabase
      .from("reviews")
      .select("*")
      .in("user_id", friendIds)
      .not("rating", "is", null)
      .limit(fetchMultiple)

    if (sortBy === "rating") {
      q = q
        .order("rating", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    } else {
      q = q.order("created_at", { ascending: false })
    }

    const { data: allReviews, error: reviewsError } = await q

    if (reviewsError) throw reviewsError

    if (!allReviews || allReviews.length === 0) {
      return res.json({ reviews: [], users: {}, games: {}, message: "no_reviews" })
    }

    const friendCount = friendIds.length
    const maxPerFriend = friendCount <= 2
      ? limitNum
      : Math.max(3, Math.ceil(limitNum / Math.min(friendCount, 5)))

    const userCounts = {}
    const diversified = []

    for (const review of allReviews) {
      if (diversified.length >= limitNum) break

      const count = userCounts[review.user_id] || 0
      if (count >= maxPerFriend) continue

      userCounts[review.user_id] = count + 1
      diversified.push(review)
    }

    if (diversified.length < limitNum) {
      for (const review of allReviews) {
        if (diversified.length >= limitNum) break
        if (diversified.some((r) => r.id === review.id)) continue
        diversified.push(review)
      }
    }

    if (sortBy === "rating") {
      diversified.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating
        return new Date(b.created_at) - new Date(a.created_at)
      })
    } else {
      diversified.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    if (diversified.length === 0) {
      return res.json({ reviews: [], users: {}, games: {}, message: "no_reviews" })
    }

    const userIds = [...new Set(diversified.map((r) => r.user_id))]
    const gameIds = [...new Set(diversified.map((r) => r.game_id))]
    const gameSlugs = [...new Set(diversified.map((r) => r.game_slug))]

    const [usersResult, gamesData, customCoversResult] = await Promise.all([
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

      supabase
        .from("user_games")
        .select("user_id, game_slug, custom_cover_url")
        .eq("user_id", userId)
        .in("game_slug", gameSlugs)
        .not("custom_cover_url", "is", null),
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

    const customCovers = {}
    if (customCoversResult.data) {
      for (const c of customCoversResult.data) {
        customCovers[c.game_slug] = c.custom_cover_url
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
            ? { url: g.cover.url?.replace("t_thumb", "t_cover_big"), image_id: g.cover.image_id }
            : null,
          customCoverUrl: customCovers[g.slug] || null,
        }
      }
    }

    const response = { reviews: diversified, users, games }

    await setCache(cacheKey, response, 120)

    res.json(response)
  } catch (e) {
    console.error("friendsReviews error:", e)
    res.status(500).json({ error: "fail" })
  }
}
