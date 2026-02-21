import {
  VALID_RATING_MODES,
  RATING_STEPS,
  LIMITS,
} from "#services/reviews/constants.js"

export function validateDates(startedOn, finishedOn) {
  const today = new Date().toISOString().split("T")[0]

  if (startedOn) {
    if (startedOn < LIMITS.MIN_DATE) return "Data de início muito antiga"
    if (startedOn > today) return "Data de início no futuro"
  }

  if (finishedOn) {
    if (finishedOn < LIMITS.MIN_DATE) return "Data de término muito antiga"
    if (finishedOn > today) return "Data de término no futuro"
  }

  if (startedOn && finishedOn && finishedOn < startedOn)
    return "Data de término não pode ser antes do início"

  return null
}

export function validateTime(hoursPlayed, minutesPlayed) {
  if (hoursPlayed != null && (!Number.isInteger(hoursPlayed) || hoursPlayed < 0 || hoursPlayed > LIMITS.MAX_HOURS))
    return `Horas jogadas inválidas (0–${LIMITS.MAX_HOURS})`

  if (minutesPlayed != null && (!Number.isInteger(minutesPlayed) || minutesPlayed < 0 || minutesPlayed > LIMITS.MAX_MINUTES))
    return `Minutos jogados inválidos (0–${LIMITS.MAX_MINUTES})`

  return null
}

export function validateRating(rating, ratingMode) {
  if (rating == null) return null
  if (!VALID_RATING_MODES.includes(ratingMode)) return "Modo de avaliação inválido"
  if (typeof rating !== "number" || rating < 0 || rating > 100) return "Nota inválida"

  const step = RATING_STEPS[ratingMode]
  if (rating % step !== 0) return "Nota incompatível com o modo"

  return null
}

export function validateAspectRatings(aspects) {
  if (!aspects) return null
  if (!Array.isArray(aspects)) return "Formato de aspectos inválido"
  if (aspects.length > LIMITS.MAX_ASPECTS) return `Máximo de ${LIMITS.MAX_ASPECTS} aspectos`

  for (const a of aspects) {
    if (!a.label || typeof a.label !== "string" || !a.label.trim())
      return "Nome do aspecto é obrigatório"

    if (a.label.length > LIMITS.MAX_ASPECT_LABEL)
      return `Nome do aspecto muito longo (máx ${LIMITS.MAX_ASPECT_LABEL})`

    const mode = a.ratingMode || LIMITS.DEFAULT_RATING_MODE

    if (!VALID_RATING_MODES.includes(mode))
      return `Aspecto "${a.label}": modo de avaliação inválido`

    if (a.rating != null) {
      const err = validateRating(a.rating, mode)
      if (err) return `Aspecto "${a.label}": ${err}`
    }

    if (a.review && typeof a.review === "string" && a.review.length > LIMITS.MAX_ASPECT_REVIEW)
      return `Aspecto "${a.label}": comentário muito longo (máx ${LIMITS.MAX_ASPECT_REVIEW})`
  }

  const labels = aspects.map(a => a.label.trim().toLowerCase())
  if (new Set(labels).size !== labels.length) return "Aspectos duplicados"

  return null
}

export function runValidations(fields) {
  for (const { check, args } of fields) {
    const error = check(...args)
    if (error) return error
  }
  return null
}