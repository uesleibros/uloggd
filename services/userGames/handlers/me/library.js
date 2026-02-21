import { supabase } from "#lib/supabase-ssr.js"

function buildGameMap(userGames, logs) {
  const gameMap = {}

  for (const ug of (userGames || [])) {
    gameMap[ug.game_slug] = {
      gameId: ug.game_id,
      slug: ug.game_slug,
      status: ug.status,
      playing: ug.playing,
      backlog: ug.backlog,
      wishlist: ug.wishlist,
      liked: ug.liked,
      ratings: [],
      latestAt: ug.updated_at,
    }
  }

  for (const log of (logs || [])) {
    const slug = log.game_slug
    if (!gameMap[slug]) {
      gameMap[slug] = {
        gameId: log.game_id,
        slug,
        status: log.status,
        playing: log.playing || false,
        backlog: log.backlog || false,
        wishlist: log.wishlist || false,
        liked: log.liked || false,
        ratings: [],
        latestAt: log.created_at,
      }
    } else {
      if (log.playing) gameMap[slug].playing = true
      if (log.backlog) gameMap[slug].backlog = true
      if (log.wishlist) gameMap[slug].wishlist = true
      if (log.liked) gameMap[slug].liked = true
      if (!gameMap[slug].status && log.status) gameMap[slug].status = log.status
    }

    if (log.rating != null) gameMap[slug].ratings.push(log.rating)
    if (log.created_at > gameMap[slug].latestAt) gameMap[slug].latestAt = log.created_at
  }

  return gameMap
}

export async function handleLibrary(req, res) {
  try {
    const [userGamesRes, logsRes] = await Promise.all([
      supabase
        .from("user_games")
        .select("game_id, game_slug, status, playing, backlog, wishlist, liked, updated_at")
        .eq("user_id", req.user.id),
      supabase
        .from("logs")
        .select("game_id, game_slug, rating, status, playing, backlog, wishlist, liked, created_at")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false }),
    ])

    if (userGamesRes.error) throw userGamesRes.error
    if (logsRes.error) throw logsRes.error

    const gameMap = buildGameMap(userGamesRes.data, logsRes.data)
    const games = {}

    for (const [slug, g] of Object.entries(gameMap)) {
      const avgRating = g.ratings.length > 0
        ? Math.round(g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length)
        : null

      games[slug] = {
        gameId: g.gameId,
        slug,
        avgRating,
        ratingCount: g.ratings.length,
        status: g.status,
        playing: g.playing,
        backlog: g.backlog,
        wishlist: g.wishlist,
        liked: g.liked,
        latestAt: g.latestAt,
      }
    }

    res.json({ games })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}

