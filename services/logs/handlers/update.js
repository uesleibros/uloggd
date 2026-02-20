import { supabase } from "#lib/supabase-ssr.js"
import { getUser } from "#utils/auth.js"
import { sanitize, safePlatform, sanitizeAspects } from "#services/logs/utils/sanitize.js"
import { validateDates, validateTime, validateRating, validateAspectRatings } from "#services/logs/utils/validators.js"
import { VALID_STATUSES, VALID_RATING_MODES, LIMITS } from "#services/logs/constants.js"

export async function handleUpdate(req, res) {
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

  const safeStatus = status != null
    ? (VALID_STATUSES.includes(status) ? status : LIMITS.DEFAULT_STATUS)
    : undefined

  const safeRatingMode = ratingMode != null
    ? (VALID_RATING_MODES.includes(ratingMode) ? ratingMode : LIMITS.DEFAULT_RATING_MODE)
    : undefined

  if (rating !== undefined) {
    const err = validateRating(rating ?? null, safeRatingMode || LIMITS.DEFAULT_RATING_MODE)
    if (err) return res.status(400).json({ error: err })
  }
  if (startedOn !== undefined || finishedOn !== undefined) {
    const err = validateDates(startedOn || null, finishedOn || null)
    if (err) return res.status(400).json({ error: err })
  }
  if (hoursPlayed !== undefined || minutesPlayed !== undefined) {
    const err = validateTime(hoursPlayed ?? null, minutesPlayed ?? null)
    if (err) return res.status(400).json({ error: err })
  }
  if (aspectRatings !== undefined) {
    const err = validateAspectRatings(aspectRatings || null)
    if (err) return res.status(400).json({ error: err })
  }

  const safeReview = review !== undefined ? sanitize(review, LIMITS.MAX_REVIEW) : undefined

  const fieldMap = {
    logTitle: ["log_title", sanitize(logTitle, LIMITS.MAX_LOG_TITLE) || LIMITS.DEFAULT_LOG_TITLE],
    rating: ["rating", rating ?? null],
    ratingMode: ["rating_mode", rating != null ? safeRatingMode : null],
    review: ["review", safeReview],
    containSpoilers: ["contain_spoilers", safeReview ? (containSpoilers ?? false) : false],
    mastered: ["mastered", mastered ?? false],
    liked: ["liked", liked ?? false],
    status: ["status", safeStatus],
    playing: ["playing", playing ?? false],
    backlog: ["backlog", backlog ?? false],
    wishlist: ["wishlist", wishlist ?? false],
    startedOn: ["started_on", startedOn || null],
    finishedOn: ["finished_on", finishedOn || null],
    replay: ["replay", replay ?? false],
    hoursPlayed: ["hours_played", hoursPlayed ?? null],
    minutesPlayed: ["minutes_played", minutesPlayed ?? null],
    platformId: ["platform_id", safePlatform(platformId)],
    playedPlatformId: ["played_platform_id", safePlatform(playedPlatformId)],
    aspectRatings: ["aspect_ratings", sanitizeAspects(aspectRatings)],
  }

  const updateData = {}
  for (const [bodyKey, [dbKey, value]] of Object.entries(fieldMap)) {
    if (req.body[bodyKey] !== undefined) {
      updateData[dbKey] = value
    }
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