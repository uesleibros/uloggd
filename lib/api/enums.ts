/*
 * What the public API accepts, which is what the site itself uses.
 *
 * These four were written out here a second time, so an endpoint could accept
 * a value no screen offered, or refuse one every screen did. They are the
 * same lists the interface is built from now, and the type of each follows
 * from the list rather than being declared beside it.
 */
export { VISIBILITIES } from "@/lib/visibility";
export { RATING_MODES } from "@/lib/review-rating";
export {
  LIBRARY_STATUSES as GAME_STATUSES,
  JOURNEY_STATUSES,
} from "@/lib/game-status";

export { COMMENT_SCOPES } from "@/lib/comment-scope";

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

/**
 * How a list item looks, and nothing about what that means.
 *
 * A list here is any of: games I want to buy, games I recommend, the best of
 * a series, a challenge, a ranking. The site offers a visual language and the
 * author says what it means, in the list's own description. There is
 * deliberately no `GOOD`, `PLAYED` or `DROPPED` in here, because naming them
 * would be the site deciding again.
 */
export const MARK_MODES = ["COLOR", "DIM"] as const;

export const MARK_COLORS = [
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "CYAN",
  "BLUE",
  "PURPLE",
  "PINK",
  "NEUTRAL",
] as const;
