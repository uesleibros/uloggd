export function formatRating(value, format) {
  if (value == null) return null
  switch (format) {
    case "stars_5":    return { display: Math.round(value / 20), max: 5 }
    case "stars_5h":   return { display: Math.round(value / 10) / 2, max: 5 }
    case "points_10":  return { display: Math.round(value / 10), max: 10 }
    case "points_10d": return { display: Math.round(value / 10 * 2) / 2, max: 10 }
    case "points_100": return { display: value, max: 100 }
    default:           return { display: value, max: 100 }
  }
}

export function toRatingValue(input, format) {
  switch (format) {
    case "stars_5":    return input * 20
    case "stars_5h":   return input * 20
    case "points_10":  return input * 10
    case "points_10d": return input * 10
    case "points_100": return input
    default:           return input
  }
}

export function ratingSteps(format) {
  switch (format) {
    case "stars_5":    return { min: 0, max: 5, step: 1 }
    case "stars_5h":   return { min: 0, max: 5, step: 0.5 }
    case "points_10":  return { min: 0, max: 10, step: 1 }
    case "points_10d": return { min: 0, max: 10, step: 0.5 }
    case "points_100": return { min: 0, max: 100, step: 1 }
    default:           return { min: 0, max: 100, step: 1 }
  }
}