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
  if (startedOn && finishedOn && finishedOn < startedOn) return "Data de término não pode ser antes do início"
  return null
}

function validateTime(hoursPlayed, minutesPlayed) {
  if (hoursPlayed != null && (!Number.isInteger(hoursPlayed) || hoursPlayed < 0 || hoursPlayed > 99999)) return "Horas jogadas inválidas (0–99999)"
  if (minutesPlayed != null && (!Number.isInteger(minutesPlayed) || minutesPlayed < 0 || minutesPlayed > 59)) return "Minutos jogados inválidos (0–59)"
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
    if (!a.label || typeof a.label !== "string" || !a.label.trim()) return "Nome do aspecto é obrigatório"
    if (a.label.length > MAX_ASPECT_LABEL) return `Nome do aspecto muito longo (máx ${MAX_ASPECT_LABEL})`

    const mode = a.ratingMode || "stars_5h"
    if (!VALID_RATING_MODES.includes(mode)) return `Aspecto "${a.label}": modo de avaliação inválido`

    if (a.rating != null) {
      const err = validateRating(a.rating, mode)
      if (err) return `Aspecto "${a.label}": ${err}`
    }

    if (a.review && typeof a.review === "string" && a.review.length > MAX_ASPECT_REVIEW) {
      return `Aspecto "${a.label}": comentário muito longo (máx ${MAX_ASPECT_REVIEW})`
    }
  }

  const labels = aspects.map(a => a.label.trim().toLowerCase())
  if (new Set(labels).size !== labels.length) return "Aspectos duplicados"

  return null
}

function sanitize(str, max) {
  if (!str || typeof str !== "string") return null
  const t = str.trim()
  return t ? t.slice(0, max) : null
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Não autorizado" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "Não autorizado" })

  const {
    gameId, gameSlug, logTitle, rating, ratingMode,
    review, containSpoilers, mastered, liked,
    status, playing, backlog, wishlist,
    startedOn, finishedOn, replay,
    hoursPlayed, minutesPlayed,
    platformId, playedPlatformId,
    aspectRatings
  } = req.body

  if (!gameId || typeof gameId !== "number") return res.status(400).json({ error: "gameId inválido" })
  if (!gameSlug || typeof gameSlug !== "string") return res.status(400).json({ error: "gameSlug inválido" })

  try {
    const games = await query("games", `fields id, category; where id = ${Math.floor(gameId)}; limit 1;`)
    if (!games.length) return res.status(404).json({ error: "Jogo não encontrado" })
    if (!REVIEWABLE_CATEGORIES.includes(games[0].category)) return res.status(400).json({ error: "Este tipo de conteúdo não pode ser avaliado" })
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
  const safePlatform = (v) => v != null && Number.isInteger(v) && v > 0 ? v : null

  const sanitizedAspects = aspectRatings?.map(a => ({
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
