export const STATUS_CONFIG = {
  played: { label: "Jogado", color: "bg-emerald-500", textColor: "text-emerald-400" },
  retired: { label: "Aposentado", color: "bg-blue-500", textColor: "text-blue-400" },
  shelved: { label: "Na prateleira", color: "bg-amber-500", textColor: "text-amber-400" },
  abandoned: { label: "Abandonado", color: "bg-red-500", textColor: "text-red-400" },
}

export const RATING_MODES = [
  { id: "stars_5", label: "★5", labelFull: "5 Estrelas" },
  { id: "stars_5h", label: "★5½", labelFull: "5 Estrelas (meia)" },
  { id: "points_10", label: "0–10", labelFull: "0–10" },
  { id: "points_10d", label: "0–10.0", labelFull: "0–10.0" },
  { id: "points_100", label: "0–100", labelFull: "0–100" },
]

export const ASPECT_SUGGESTIONS = [
  "Gameplay", "História", "Personagens", "Trilha sonora", "Gráficos",
  "Level design", "Rejogabilidade", "Multiplayer", "Performance", "UI/UX"
]

export const MAX_ASPECTS = 10
export const MAX_ASPECT_LABEL = 30
export const MAX_ASPECT_REVIEW = 500
export const MAX_REVIEW_LENGTH = 10000
export const MAX_TITLE_LENGTH = 24