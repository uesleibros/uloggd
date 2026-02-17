import { supabase } from "../lib/supabase-ssr.js"

const VALID_STATUSES = ["played", "completed", "retired", "shelved", "abandoned"]

async function getUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

async function handleGet(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle()

    if (error) throw error
    res.json(data || { status: null, playing: false, backlog: false, wishlist: false, liked: false })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch" })
  }
}

async function handleUpdate(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { gameId, gameSlug, field, value } = req.body
  if (!gameId || !gameSlug) return res.status(400).json({ error: "gameId and gameSlug required" })

  const allowedFields = ["status", "playing", "backlog", "wishlist", "liked"]
  if (!allowedFields.includes(field)) return res.status(400).json({ error: "invalid field" })

  if (field === "status" && value !== null && !VALID_STATUSES.includes(value))
    return res.status(400).json({ error: "invalid status" })

  if (field !== "status" && typeof value !== "boolean")
    return res.status(400).json({ error: "value must be boolean" })

  try {
    const { data: existing } = await supabase
      .from("user_games")
      .select("id")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle()

    let result

    if (existing) {
      const { data, error } = await supabase
        .from("user_games")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const row = {
        user_id: user.id,
        game_id: gameId,
        game_slug: gameSlug.trim().slice(0, 200),
        status: null,
        playing: false,
        backlog: false,
        wishlist: false,
        liked: false,
        [field]: value,
      }

      const { data, error } = await supabase
        .from("user_games")
        .insert(row)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to update" })
  }
}

async function handleProfileGames(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  try {
    const { data: userGames, error: ugError } = await supabase
      .from("user_games")
      .select("game_id, game_slug, status, playing, backlog, wishlist, liked, updated_at")
      .eq("user_id", userId)

    if (ugError) throw ugError

    const { data: logs, error: logsError } = await supabase
      .from("logs")
      .select("game_id, game_slug, rating, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (logsError) throw logsError

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
          playing: false,
          backlog: false,
          wishlist: false,
          liked: false,
          ratings: [],
          hasLog: true,
          latestAt: log.created_at,
        }
      } else {
        gameMap[slug].hasLog = true
        if (!gameMap[slug].status && log.status) gameMap[slug].status = log.status
      }

      if (log.rating != null) gameMap[slug].ratings.push(log.rating)

      if (log.created_at > gameMap[slug].latestAt) {
        gameMap[slug].latestAt = log.created_at
      }
    }

    const games = {}
    const counts = { playing: 0, completed: 0, backlog: 0, wishlist: 0, dropped: 0, rated: 0 }

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
      if (g.status === "completed") counts.completed++
      if (g.backlog) counts.backlog++
      if (g.wishlist) counts.wishlist++
      if (g.status === "abandoned") counts.dropped++
      if (g.ratings.length > 0) counts.rated++
    }

    res.json({ games, counts })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch profile games" })
  }
}

const ACTIONS = {
  get: handleGet,
  update: handleUpdate,
  "profile-games": handleProfileGames,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "action not found" })
  return fn(req, res)
}
