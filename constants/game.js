export const GAME_STATUS = {
  played: {
    id: "played",
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    bgClass: "bg-emerald-500/15",
    borderClass: "border-emerald-500/30",
  },
  retired: {
    id: "retired",
    color: "bg-blue-500",
    textColor: "text-blue-400",
    bgClass: "bg-blue-500/15",
    borderClass: "border-blue-500/30",
  },
  shelved: {
    id: "shelved",
    color: "bg-amber-500",
    textColor: "text-amber-400",
    bgClass: "bg-amber-500/15",
    borderClass: "border-amber-500/30",
  },
  abandoned: {
    id: "abandoned",
    color: "bg-red-500",
    textColor: "text-red-400",
    bgClass: "bg-red-500/15",
    borderClass: "border-red-500/30",
  },
}

export const STATUS_OPTIONS = Object.values(GAME_STATUS)

export const RATING_MODES = [
  { id: "stars_5" },
  { id: "stars_5h" },
  { id: "points_10" },
  { id: "points_10d" },
  { id: "points_100" },
]

export const ASPECT_SUGGESTIONS = [
  "gameplay",
  "story",
  "characters",
  "soundtrack",
  "graphics",
  "levelDesign",
  "replayability",
  "multiplayer",
  "performance",
  "uiux",
]

export const MAX_ASPECTS = 10
export const MAX_ASPECT_LABEL = 30
export const MAX_ASPECT_REVIEW = 500
export const MAX_REVIEW_LENGTH = 10000
export const MAX_TITLE_LENGTH = 24

export const SORT_OPTIONS = [
  { key: "recent" },
  { key: "rating" },
]
