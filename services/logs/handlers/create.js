import { supabase } from "../../../lib/supabase-ssr.js"
import { query } from "../../../lib/igdb-wrapper.js"
import { getUser } from "../../../utils/auth.js"
import { sanitize, safePlatform, sanitizeAspects } from "../utils/sanitize.js"
import { validateDates, validateTime, validateRating, validateAspectRatings, runValidations } from "../utils/validators.js"
import { VALID_STATUSES, VALID_RATING_MODES, LIMITS } from "../constants.js"

export async function handleCreate(req, res) {
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
      `fields id, game_type; where id = ${Math.floor(gameId)}; limit 1;`
    )
    if (!games.length)
      return res.status(404).json({ error: "Jogo não encontrado" })
  } catch (e) {
    console.error(e)
    return res.status(502).json({ error: "Falha ao validar o jogo" })
  }

  const safeStatus = VALID_STATUSES.includes(status) ? status : LIMITS.DEFAULT_STATUS
  const safeRatingMode = VALID_RATING_MODES.includes(ratingMode) ? ratingMode : LIMITS.DEFAULT_RATING_MODE

  const validationError = runValidations([
    { check: validateRating, args: [rating ?? null, safeRatingMode] },
    { check: validateDates, args: [startedOn || null, finishedOn || null] },
    { check: validateTime, args: [hoursPlayed ?? null, minutesPlayed ?? null] },
    { check: validateAspectRatings, args: [aspectRatings || null] },
  ])
  if (validationError) return res.status(400).json({ error: validationError })

  const safeReview = sanitize(review, LIMITS.MAX_REVIEW)

  try {
    const { data, error } = await supabase
      .from("logs")
      .insert({
        user_id: user.id,
        game_id: gameId,
        game_slug: gameSlug.trim().slice(0, LIMITS.MAX_SLUG),
        log_title: sanitize(logTitle, LIMITS.MAX_LOG_TITLE) || LIMITS.DEFAULT_LOG_TITLE,
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
        aspect_ratings: sanitizeAspects(aspectRatings),
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
