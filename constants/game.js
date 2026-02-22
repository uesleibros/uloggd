export const GAME_STATUS = {
  played: {
    id: "played",
    label: "Jogado",
    sub: "Zerou o objetivo principal",
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    bgClass: "bg-emerald-500/15",
    borderClass: "border-emerald-500/30",
  },
  retired: {
    id: "retired",
    label: "Aposentado",
    sub: "Terminou um jogo sem final",
    color: "bg-blue-500",
    textColor: "text-blue-400",
    bgClass: "bg-blue-500/15",
    borderClass: "border-blue-500/30",
  },
  shelved: {
    id: "shelved",
    label: "Na prateleira",
    sub: "Não terminou mas pode voltar",
    color: "bg-amber-500",
    textColor: "text-amber-400",
    bgClass: "bg-amber-500/15",
    borderClass: "border-amber-500/30",
  },
  abandoned: {
    id: "abandoned",
    label: "Abandonado",
    sub: "Não terminou e não vai voltar",
    color: "bg-red-500",
    textColor: "text-red-400",
    bgClass: "bg-red-500/15",
    borderClass: "border-red-500/30",
  },
}

export const STATUS_OPTIONS = Object.values(GAME_STATUS)

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
