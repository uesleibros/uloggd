export const VALID_STATUSES = ["played", "completed", "retired", "shelved", "abandoned"]

export const ALLOWED_FIELDS = ["status", "playing", "backlog", "wishlist", "liked"]

export const BOOLEAN_FIELDS = ["playing", "backlog", "wishlist", "liked"]

export const DEFAULT_GAME_STATE = {
  status: null,
  playing: false,
  backlog: false,
  wishlist: false,
  liked: false,
}

export const MAX_SLUG = 200