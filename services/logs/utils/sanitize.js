import { VALID_RATING_MODES, LIMITS } from "#services/logs/constants.js"

export function sanitize(str, max) {
  if (!str || typeof str !== "string") return null
  const t = str.trim()
  return t ? t.slice(0, max) : null
}

export function safePlatform(v) {
  return v != null && Number.isInteger(v) && v > 0 ? v : null
}

export function sanitizeAspects(aspects) {
  if (!aspects) return null

  return aspects.map(a => ({
    label: a.label.trim().slice(0, LIMITS.MAX_ASPECT_LABEL),
    rating: a.rating ?? null,
    ratingMode: VALID_RATING_MODES.includes(a.ratingMode)
      ? a.ratingMode
      : LIMITS.DEFAULT_RATING_MODE,
    review: sanitize(a.review, LIMITS.MAX_ASPECT_REVIEW),
  }))
}