import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"
import { getCache, setCache } from "#lib/cache.js"

export async function handlePopularAmongFriends(req, res) {
  const userId = req.user.id
  const limit = Math.min(parseInt(req.query.limit) || 10, 20)

  const cacheKey = `home_popular_friends_${userId}`
  const cached = await getCache(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { data: following, error: followError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)

    if (followError) throw followError

    if (!following || following.length === 0) {
      return res.json({ games: [], message: "no_friends" })
    }

    const friendIds = following.map((f) => f.following_id)

    const { data: friendGames, error: gamesError } = await supabase
      .from("user_games")
      .select(`
        game_id,
        game_slug,
        user_id,
        playing,
        status,
        liked,
        updated_at
      `)
      .in("user_id", friendIds)
      .or("playing.eq.true,status.not.is.null,liked.eq.true")
      .order("updated_at", { ascending: false })
      .limit(500)

    if (gamesError) throw gamesError

    if (!friendGames || friendGames.length === 0) {
      return res.json({ games: [], message: "no_activity" })
    }

    const gameStats = {}

    for (const entry of friendGames) {
      const slug = entry.game_slug

      if (!gameStats[slug]) {
        gameStats[slug] = {
          game_id: entry.game_id,
          game_slug: slug,
          playing_count: 0,
          played_count: 0,
          liked_count: 0,
          total_score: 0,
          friends: [],
          last_activity: entry.updated_at,
        }
      }

      const stat = gameStats[slug]

      if (entry.playing) stat.playing_count++
      if (entry.status) stat.played_count++
      if (entry.liked) stat.liked_count++

      stat.total_score =
        stat.playing_count * 3 +
        stat.played_count * 2 +
        stat.liked_count * 1

      if (!stat.friends.includes(entry.user_id)) {
        stat.friends.push(entry.user_id)
      }

      if (new Date(entry.updated_at) > new Date(stat.last_activity)) {
        stat.last_activity = entry.updated_at
      }
    }

    const sortedGames = Object.values(gameStats)
      .filter((g) => g.friends.length >= 1)
      .sort((a, b) => {
        if (b.friends.length !== a.friends.length) {
          return b.friends.length - a.friends.length
        }
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score
        }
        return new Date(b.last_activity) - new Date(a.last_activity)
      })
      .slice(0, limit)

    if (sortedGames.length === 0) {
      return res.json({ games: [], message: "no_popular" })
    }

    const friendUserIds = [...new Set(sortedGames.flatMap((g) => g.friends))]

    const { data: friendsData } = await supabase
      .from("users")
      .select("user_id, username, avatar")
      .in("user_id", friendUserIds)

    const friendsMap = {}
    if (friendsData) {
      for (const f of friendsData) {
        friendsMap[f.user_id] = {
          user_id: f.user_id,
          username: f.username,
          avatar: f.avatar,
        }
      }
    }

    const slugList = sortedGames.map((g) => `"${g.game_slug}"`).join(",")

    const igdbGames = await query("games", `
      fields name, slug, cover.url, cover.image_id, total_rating;
      where slug = (${slugList});
      limit ${sortedGames.length};
    `)

    const igdbMap = {}
    for (const g of igdbGames) {
      igdbMap[g.slug] = {
        id: g.id,
        name: g.name,
        slug: g.slug,
        total_rating: g.total_rating,
        cover: g.cover?.url
          ? { ...g.cover, url: g.cover.url.replace("t_thumb", "t_cover_big") }
          : null,
      }
    }

    const result = sortedGames
      .map((stat) => {
        const igdb = igdbMap[stat.game_slug]
        if (!igdb) return null

        return {
          ...igdb,
          playing_count: stat.playing_count,
          played_count: stat.played_count,
          liked_count: stat.liked_count,
          friends_count: stat.friends.length,
          friends: stat.friends.slice(0, 5).map((id) => friendsMap[id]).filter(Boolean),
          last_activity: stat.last_activity,
        }
      })
      .filter(Boolean)

    const response = { games: result }

    await setCache(cacheKey, response, 300)

    res.json(response)
  } catch (e) {
    console.error("popularAmongFriends error:", e)
    res.status(500).json({ error: "fail" })
  }
}
