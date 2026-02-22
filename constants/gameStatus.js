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
