import { supabase } from "../../lib/supabase-ssr.js"
import { query } from "../../lib/igdb-wrapper.js"

const VALID_STATUSES = ["played", "completed", "retired", "shelved", "abandoned"]
const VALID_RATING_MODES = ["stars_5", "stars_5h", "points_10", "points_10d", "points_100"]
const REVIEWABLE_CATEGORIES = [0, 1, 2, 3, 4, 8, 9, 10, 11, 14]
const MIN_DATE = "2000-01-01"
const MAX_ASPECTS = 10
const MAX_ASPECT_LABEL = 30
const MAX_ASPECT_REVIEW = 1000

function validateDates(startedOn, finishedOn) {
  const today = new Date().toISOString().split("T")[0]
  if (startedOn) {
    if (startedOn < MIN_DATE) return "Data de início muito antiga"
    if (startedOn > today) return "Data de início no futuro"
  }
  if (finishedOn) {
    if (finishedOn < MIN_DATE) return "Data de término muito antiga"
    if (finishedOn > today) return "Data de término no futuro"
  }
  if (startedOn && finishedOn && finishedOn < startedOn)
    return "Data de término não pode ser antes do início"
  return null
}

function validateTime(hoursPlayed, minutesPlayed) {
  if (hoursPlayed != null && (!Number.isInteger(hoursPlayed) || hoursPlayed < 0 || hoursPlayed > 99999))
    return "Horas jogadas inválidas (0–99999)"
  if (minutesPlayed != null && (!Number.isInteger(minutesPlayed) || minutesPlayed < 0 || minutesPlayed > 59))
    return "Minutos jogados inválidos (0–59)"
  return null
}

function validateRating(rating, ratingMode) {
  if (rating == null) return null
  if (!VALID_RATING_MODES.includes(ratingMode)) return "Modo de avaliação inválido"
  if (typeof rating !== "number" || rating < 0 || rating > 100) return "Nota inválida"
  const stepMap = { stars_5: 20, stars_5h: 10, points_10: 10, points_10d: 5, points_100: 1 }
  if (rating % stepMap[ratingMode] !== 0) return "Nota incompatível com o modo"
  return null
}

function validateAspectRatings(aspects) {
  if (!aspects) return null
  if (!Array.isArray(aspects)) return "Formato de aspectos inválido"
  if (aspects.length > MAX_ASPECTS) return `Máximo de ${MAX_ASPECTS} aspectos`
  for (const a of aspects) {
    if (!a.label || typeof a.label !== "string" || !a.label.trim())
      return "Nome do aspecto é obrigatório"
    if (a.label.length > MAX_ASPECT_LABEL)
      return `Nome do aspecto muito longo (máx ${MAX_ASPECT_LABEL})`
    const mode = a.ratingMode || "stars_5h"
    if (!VALID_RATING_MODES.includes(mode))
      return `Aspecto "${a.label}": modo de avaliação inválido`
    if (a.rating != null) {
      const err = validateRating(a.rating, mode)
      if (err) return `Aspecto "${a.label}": ${err}`
    }
    if (a.review && typeof a.review === "string" && a.review.length > MAX_ASPECT_REVIEW)
      return `Aspecto "${a.label}": comentário muito longo (máx ${MAX_ASPECT_REVIEW})`
  }
  const labels = aspects.map((a) => a.label.trim().toLowerCase())
  if (new Set(labels).size !== labels.length) return "Aspectos duplicados"
  return null
}

function sanitize(str, max) {
  if (!str || typeof str !== "string") return null
  const t = str.trim()
  return t ? t.slice(0, max) : null
}

const safePlatform = (v) =>
  v != null && Number.isInteger(v) && v > 0 ? v : null

async function getUser(req) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return null
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

async function handleCreate(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "Não autorizado" })

  const {
    gameId, gameSlug, logTitle, rating, ratingMode,
    review, containSpoilers, mastered, liked,
    status, playing, backlog, wishlist,
    startedOn, finishedOn, replay,
    hoursPlayed, minutesPlayed,
    platformId, playedPlatformId, aspectRatings,
  } = req.body

  if (!gameId || typeof gameId !== "number")
    return res.status(400).json({ error: "gameId inválido" })
  if (!gameSlug || typeof gameSlug !== "string")
    return res.status(400).json({ error: "gameSlug inválido" })

  try {
    const games = await query(
      "games",
      `fields id, category; where id = ${Math.floor(gameId)}; limit 1;`
    )
    if (!games.length)
      return res.status(404).json({ error: "Jogo não encontrado" })
    if (!REVIEWABLE_CATEGORIES.includes(games[0].category))
      return res.status(400).json({ error: "Este tipo de conteúdo não pode ser avaliado" })
  } catch (e) {
    console.error(e)
    return res.status(502).json({ error: "Falha ao validar o jogo" })
  }

  const safeStatus = VALID_STATUSES.includes(status) ? status : "played"
  const safeRatingMode = VALID_RATING_MODES.includes(ratingMode) ? ratingMode : "stars_5h"

  const ratingError = validateRating(rating ?? null, safeRatingMode)
  if (ratingError) return res.status(400).json({ error: ratingError })

  const dateError = validateDates(startedOn || null, finishedOn || null)
  if (dateError) return res.status(400).json({ error: dateError })

  const timeError = validateTime(hoursPlayed ?? null, minutesPlayed ?? null)
  if (timeError) return res.status(400).json({ error: timeError })

  const aspectError = validateAspectRatings(aspectRatings || null)
  if (aspectError) return res.status(400).json({ error: aspectError })

  const safeReview = sanitize(review, 10000)

  const sanitizedAspects =
    aspectRatings?.map((a) => ({
      label: a.label.trim().slice(0, MAX_ASPECT_LABEL),
      rating: a.rating ?? null,
      ratingMode: VALID_RATING_MODES.includes(a.ratingMode) ? a.ratingMode : "stars_5h",
      review: sanitize(a.review, MAX_ASPECT_REVIEW),
    })) || null

  try {
    const { data, error } = await supabase
      .from("logs")
      .insert({
        user_id: user.id,
        game_id: gameId,
        game_slug: gameSlug.trim().slice(0, 200),
        log_title: sanitize(logTitle, 24) || "Log",
        rating: rating ?? null,
        rating_mode: rating != null ? safeRatingMode : null,
        review: safeReview,
        contain_spoilers: safeReview ? (containSpoilers ?? false) : false,
        mastered: mastered ?? false,
        liked: liked ?? false,
        status: safeStatus,
        playing: playing ?? false,
        backlog: backlog ?? false,
        wishlist: wishlist ?? false,
        started_on: startedOn || null,
        finished_on: finishedOn || null,
        replay: replay ?? false,
        hours_played: hoursPlayed ?? null,
        minutes_played: minutesPlayed ?? null,
        platform_id: safePlatform(platformId),
        played_platform_id: safePlatform(playedPlatformId),
        aspect_ratings: sanitizedAspects,
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Falha ao criar log" })
  }
}

async function handleDelete(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { logId } = req.body
  if (!logId) return res.status(400).json({ error: "logId required" })

  try {
    const { error } = await supabase
      .from("logs")
      .delete()
      .eq("id", logId)
      .eq("user_id", user.id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to delete log" })
  }
}

async function handleGame(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch logs" })
  }
}

async function handlePublic(req, res) {
  const { gameId, sortBy = "recent", page = 1, limit = 20 } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  const offset = (page - 1) * limit

  try {
    let q = supabase
      .from("logs")
      .select("*", { count: "exact" })
      .eq("game_id", gameId)
      .range(offset, offset + limit - 1)

    if (sortBy === "rating") {
      q = q
        .order("rating", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    } else {
      q = q.order("created_at", { ascending: false })
    }

    const { data: logs, count, error } = await q
    if (error) throw error

    const userIds = [...new Set((logs || []).map((l) => l.user_id))]
    const users = {}

    if (userIds.length > 0) {
      const { data: usersData } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      })

      const { data: badgesData } = await supabase
        .from("user_badges")
        .select("user_id, badge:badges(id, title, description)")
        .in("user_id", userIds)

      const badgesMap = {}
      if (badgesData) {
        for (const row of badgesData) {
          if (!badgesMap[row.user_id]) badgesMap[row.user_id] = []
          if (row.badge) badgesMap[row.user_id].push(row.badge)
        }
      }

      if (usersData?.users) {
        for (const uid of userIds) {
          const authUser = usersData.users.find((u) => u.id === uid)
          if (authUser) {
            users[uid] = {
              username: authUser.user_metadata?.full_name,
              avatar: authUser.user_metadata?.avatar_url,
              badges: badgesMap[uid] || [],
            }
          }
        }
      }
    }

    res.json({
      logs: logs || [],
      users,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch reviews" })
  }
}

async function handleStats(req, res) {
  const { gameId } = req.body
  if (!gameId) return res.status(400).json({ error: "gameId required" })

  try {
    const { data, error } = await supabase
      .from("logs")
      .select("rating, status, liked")
      .eq("game_id", gameId)
      .not("rating", "is", null)

    if (error) throw error

    const ratings = data.filter((l) => l.rating != null).map((l) => l.rating)
    const avgRating =
      ratings.length > 0
        ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
        : null

    const { count: totalLogs } = await supabase
      .from("logs")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)

    const { count: totalLikes } = await supabase
      .from("logs")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("liked", true)

    const statusCounts = {}
    data.forEach((l) => {
      if (l.status) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1
    })

    res.json({ avgRating, totalRatings: ratings.length, totalLogs, totalLikes, statusCounts })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch stats" })
  }
}

async function handleUpdate(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "Não autorizado" })

  const {
    logId, logTitle, rating, ratingMode,
    review, containSpoilers, mastered, liked,
    status, playing, backlog, wishlist,
    startedOn, finishedOn, replay,
    hoursPlayed, minutesPlayed,
    platformId, playedPlatformId, aspectRatings,
  } = req.body

  if (!logId) return res.status(400).json({ error: "logId é obrigatório" })

  const safeStatus =
    status != null ? (VALID_STATUSES.includes(status) ? status : "played") : undefined
  const safeRatingMode =
    ratingMode != null
      ? VALID_RATING_MODES.includes(ratingMode) ? ratingMode : "stars_5h"
      : undefined

  if (rating !== undefined) {
    const ratingError = validateRating(rating ?? null, safeRatingMode || "stars_5h")
    if (ratingError) return res.status(400).json({ error: ratingError })
  }
  if (startedOn !== undefined || finishedOn !== undefined) {
    const dateError = validateDates(startedOn || null, finishedOn || null)
    if (dateError) return res.status(400).json({ error: dateError })
  }
  if (hoursPlayed !== undefined || minutesPlayed !== undefined) {
    const timeError = validateTime(hoursPlayed ?? null, minutesPlayed ?? null)
    if (timeError) return res.status(400).json({ error: timeError })
  }
  if (aspectRatings !== undefined) {
    const aspectError = validateAspectRatings(aspectRatings || null)
    if (aspectError) return res.status(400).json({ error: aspectError })
  }

  const safeReview = review !== undefined ? sanitize(review, 10000) : undefined

  const updateData = {}
  if (logTitle !== undefined) updateData.log_title = sanitize(logTitle, 24) || "Log"
  if (rating !== undefined) updateData.rating = rating ?? null
  if (ratingMode !== undefined) updateData.rating_mode = rating != null ? safeRatingMode : null
  if (safeReview !== undefined) updateData.review = safeReview
  if (containSpoilers !== undefined)
    updateData.contain_spoilers = safeReview ? (containSpoilers ?? false) : false
  if (mastered !== undefined) updateData.mastered = mastered ?? false
  if (liked !== undefined) updateData.liked = liked ?? false
  if (safeStatus !== undefined) updateData.status = safeStatus
  if (playing !== undefined) updateData.playing = playing ?? false
  if (backlog !== undefined) updateData.backlog = backlog ?? false
  if (wishlist !== undefined) updateData.wishlist = wishlist ?? false
  if (startedOn !== undefined) updateData.started_on = startedOn || null
  if (finishedOn !== undefined) updateData.finished_on = finishedOn || null
  if (replay !== undefined) updateData.replay = replay ?? false
  if (hoursPlayed !== undefined) updateData.hours_played = hoursPlayed ?? null
  if (minutesPlayed !== undefined) updateData.minutes_played = minutesPlayed ?? null
  if (platformId !== undefined) updateData.platform_id = safePlatform(platformId)
  if (playedPlatformId !== undefined) updateData.played_platform_id = safePlatform(playedPlatformId)
  if (aspectRatings !== undefined) {
    updateData.aspect_ratings = aspectRatings
      ? aspectRatings.map((a) => ({
          label: a.label.trim().slice(0, MAX_ASPECT_LABEL),
          rating: a.rating ?? null,
          ratingMode: VALID_RATING_MODES.includes(a.ratingMode) ? a.ratingMode : "stars_5h",
          review: sanitize(a.review, MAX_ASPECT_REVIEW),
        }))
      : null
  }

  if (Object.keys(updateData).length === 0)
    return res.status(400).json({ error: "Nada para atualizar" })

  try {
    const { data, error } = await supabase
      .from("logs")
      .update(updateData)
      .eq("id", logId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ error: "Log não encontrado" })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Falha ao atualizar log" })
  }
}

async function handleUser(req, res) {
  const { userId, status, page = 1, limit = 20 } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  const offset = (page - 1) * limit

  try {
    let q = supabase
      .from("logs")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) q = q.eq("status", status)

    const { data, count, error } = await q
    if (error) throw error

    res.json({
      logs: data || [],
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch logs" })
  }
}

const ACTIONS = {
  create: handleCreate,
  delete: handleDelete,
  game: handleGame,
  public: handlePublic,
  stats: handleStats,
  update: handleUpdate,
  user: handleUser,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const fn = ACTIONS[action]

  if (!fn) return res.status(404).json({ error: "Action not found" })

  return fn(req, res)
}
