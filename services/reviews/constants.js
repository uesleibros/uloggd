export const VALID_STATUSES = ["played", "retired", "shelved", "abandoned"]

export const VALID_RATING_MODES = ["stars_5", "stars_5h", "points_10", "points_10d", "points_100"]

export const RATING_STEPS = {
  stars_5: 20,
  stars_5h: 10,
  points_10: 10,
  points_10d: 5,
  points_100: 1,
}

export const LIMITS = {
  MIN_DATE: "2000-01-01",
  MAX_ASPECTS: 10,
  MAX_ASPECT_LABEL: 30,
  MAX_ASPECT_REVIEW: 500,
  MAX_REVIEW: 10000,
  MAX_REVIEW_TITLE: 24,
  MAX_SLUG: 200,
  MAX_HOURS: 99999,
  MAX_MINUTES: 59,
  DEFAULT_REVIEW_TITLE: "Review",
  DEFAULT_RATING_MODE: "stars_5h",
  DEFAULT_STATUS: "played",
}
