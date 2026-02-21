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
      hasLog: false,
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
        hasLog: true,
        latestAt: log.created_at,
      }
    } else {
      gameMap[slug].hasLog = true
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

function aggregateGames(gameMap) {
  const games = {}
  const counts = {
    playing: 0,
    played: 0,
    completed: 0,
    backlog: 0,
    wishlist: 0,
    dropped: 0,
    shelved: 0,
    liked: 0,
    rated: 0,
  }

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
      hasLog: g.hasLog,
      latestAt: g.latestAt,
    }

    if (g.playing) counts.playing++
    if (g.status === "played") counts.played++
    if (g.status === "completed") counts.completed++
    if (g.backlog) counts.backlog++
    if (g.wishlist) counts.wishlist++
    if (g.status === "abandoned") counts.dropped++
    if (g.status === "shelved") counts.shelved++
    if (g.liked) counts.liked++
    if (g.ratings.length > 0) counts.rated++
  }

  return { games, counts }
}

export async function handleProfileGames(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const [userGamesRes, logsRes] = await Promise.all([
      supabase
        .from("user_games")
        .select("game_id, game_slug, status, playing, backlog, wishlist, liked, updated_at")
        .eq("user_id", userId),
      supabase
        .from("reviews")
        .select("game_id, game_slug, rating, status, playing, backlog, wishlist, liked, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ])

    if (userGamesRes.error) throw userGamesRes.error
    if (logsRes.error) throw logsRes.error

    const gameMap = buildGameMap(userGamesRes.data, logsRes.data)
    res.json(aggregateGames(gameMap))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
