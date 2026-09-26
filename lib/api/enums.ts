export const VISIBILITIES = ["PUBLIC", "FOLLOWERS", "PRIVATE"] as const;

export const RATING_MODES = [
  "stars_5",
  "level_5",
  "score_10",
  "score_100",
  "recommend",
] as const;

export const GAME_STATUSES = [
  "BACKLOG",
  "PLAYING",
  "ON_HOLD",
  "COMPLETED",
  "DROPPED",
  "WISHLIST",
] as const;

export const COMMENT_SCOPES = ["EVERYONE", "FOLLOWERS", "NOBODY"] as const;

/** What a run is, which is not what a game is: a run of one game can end. */
export const JOURNEY_STATUSES = [
  "PLANNED",
  "PLAYING",
  "COMPLETED",
  "DROPPED",
  "ON_HOLD",
] as const;

/**
 * A copy is constrained rather than free text.
 *
 * "Steam", "steam" and "STEAM " as three answers makes every statistic built
 * on top of it wrong. OTHER exists so the list never blocks anybody, and the
 * copy's note is where the unusual case goes.
 */
export const STOREFRONTS = [
  "STEAM",
  "PLAYSTATION",
  "NINTENDO",
  "XBOX",
  "GOG",
  "EPIC",
  "ITCH",
  "NUUVEM",
  "BATTLE_NET",
  "UBISOFT",
  "EA",
  "AMAZON",
  "HUMBLE",
  "GOOGLE_PLAY",
  "APP_STORE",
  "RETAIL",
  "OTHER",
] as const;

export const OWNERSHIPS = [
  "OWNED",
  "SUBSCRIPTION",
  "BORROWED",
  "RENTED",
  "SHARED",
  "PREVIOUSLY_OWNED",
] as const;

export const MEDIUMS = ["PHYSICAL", "DIGITAL"] as const;
