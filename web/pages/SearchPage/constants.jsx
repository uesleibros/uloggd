import { Gamepad2, Users, ListMusic } from "lucide-react"

export const TABS = [
  { id: "games", icon: Gamepad2 },
  { id: "users", icon: Users },
  { id: "lists", icon: ListMusic },
]

export const SORT_OPTIONS = {
  games: [
    { value: "relevance" },
    { value: "name" },
    { value: "rating" },
    { value: "release_desc" },
    { value: "release_asc" },
  ],
  users: [
    { value: "relevance" },
    { value: "username" },
    { value: "newest" },
  ],
  lists: [
    { value: "relevance" },
    { value: "title" },
    { value: "games_count" },
    { value: "newest" },
  ],
}

export const PER_PAGE = 20