import { Gamepad2, Users, ListMusic } from "lucide-react"

export const TABS = [
  { id: "games", label: "Jogos", icon: Gamepad2 },
  { id: "users", label: "Usuários", icon: Users },
  { id: "lists", label: "Listas", icon: ListMusic },
]

export const SORT_OPTIONS = {
  games: [
    { value: "relevance", label: "Relevância" },
    { value: "name", label: "Nome (A-Z)" },
    { value: "rating", label: "Avaliação" },
    { value: "release_desc", label: "Mais recentes" },
    { value: "release_asc", label: "Mais antigos" },
  ],
  users: [
    { value: "relevance", label: "Relevância" },
    { value: "username", label: "Nome (A-Z)" },
    { value: "newest", label: "Mais recentes" },
  ],
  lists: [
    { value: "relevance", label: "Relevância" },
    { value: "title", label: "Título (A-Z)" },
    { value: "games_count", label: "Mais jogos" },
    { value: "newest", label: "Mais recentes" },
  ],
}

export const PER_PAGE = 20