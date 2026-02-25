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

function aggregateGames(gameMap, { page = 1, limit = 20, filter = null } = {}) {
  const counts = {
    total: 0,
    playing: 0,
    played: 0,
    completed: 0,
    backlog: 0,
    wishlist: 0,
    dropped: 0,
    shelved: 0,
    liked: 0,
    rated: 0,
    reviewed: 0,
  }

  const allGames = []

  for (const [slug, g] of Object.entries(gameMap)) {
    const avgRating = g.ratings.length > 0
      ? Math.round(g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length)
      : null

    const game = {
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

    counts.total++
    if (g.playing) counts.playing++
    if (g.status === "played") counts.played++
    if (g.status === "completed") counts.completed++
    if (g.backlog) counts.backlog++
    if (g.wishlist) counts.wishlist++
    if (g.status === "abandoned") counts.dropped++
    if (g.status === "shelved") counts.shelved++
    if (g.liked) counts.liked++
    if (g.hasLog) counts.rated++
    if (g.hasLog) counts.reviewed++

    const matchesFilter = !filter || (
      (filter === "playing" && g.playing) ||
      (filter === "played" && g.status === "played") ||
      (filter === "completed" && g.status === "completed") ||
      (filter === "backlog" && g.backlog) ||
      (filter === "wishlist" && g.wishlist) ||
      (filter === "dropped" && g.status === "abandoned") ||
      (filter === "shelved" && g.status === "shelved") ||
      (filter === "liked" && g.liked) ||
      (filter === "rated" && g.hasLog)
    )

    if (matchesFilter) allGames.push(game)
  }

  allGames.sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))

  const total = allGames.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const games = allGames.slice(offset, offset + limit)

  return { games, counts, total, page, totalPages }
}

export async function handleProfileGames(req, res) {
  const { userId, page = 1, limit = 20, filter = null } = req.body
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
    res.json(aggregateGames(gameMap, { page, limit, filter }))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}