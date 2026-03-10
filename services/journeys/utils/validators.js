import { LIMITS } from "#services/journeys/constants.js"

export function validateTitle(title) {
  if (!title || typeof title !== "string") return "title is required"
  if (title.trim().length === 0) return "title cannot be empty"
  if (title.length > LIMITS.MAX_TITLE) return "title too long"
  return null
}

export function validateDate(date) {
  if (!date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "invalid date format"
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) return "invalid date"
  return null
}

export function validateTime(hours, minutes) {
  if (hours != null) {
    if (!Number.isInteger(hours) || hours < 0 || hours > LIMITS.MAX_HOURS) {
      return "invalid hours"
    }
  }
  if (minutes != null) {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > LIMITS.MAX_MINUTES) {
      return "invalid minutes"
    }
  }
  return null
}

export function runValidations(validations) {
  for (const { check, args } of validations) {
    const error = check(...args)
    if (error) return error
  }
  return null
}
