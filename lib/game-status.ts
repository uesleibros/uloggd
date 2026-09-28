import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What the six library statuses and the five run statuses are called.
 *
 * Two vocabularies, deliberately, because they are about different things: a
 * library status says where a game stands with you, and a run status says how
 * one pass through it went. "Completed" on a shelf means you have played the
 * game; "Completed" on a run means that particular playthrough reached the
 * end, and somebody can have three runs of a game in three states.
 *
 * Both lived in the components that drew them, which meant the library's six
 * words existed twice, word for word, and in two languages out of the three
 * this site speaks: the card under a cover and the panel on a game's page
 * disagreed with the rest of the interface in Spanish by saying nothing at
 * all.
 */

export const LIBRARY_STATUSES = [
  "COMPLETED",
  "PLAYING",
  "ON_HOLD",
  "DROPPED",
  "BACKLOG",
  "WISHLIST",
] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

const LIBRARY: Record<LibraryStatus, [string, string, string]> = {
  // "Played" rather than "Completed": somebody who finished a game and
  // somebody who put sixty hours into a game with no ending are both saying
  // the same thing here.
  COMPLETED: ["Jogado", "Played", "Jugado"],
  PLAYING: ["Jogando", "Playing", "Jugando"],
  ON_HOLD: ["Pausado", "Shelved", "En pausa"],
  DROPPED: ["Abandonado", "Abandoned", "Abandonado"],
  BACKLOG: ["Backlog", "Backlog", "Backlog"],
  WISHLIST: ["Lista de desejos", "Wishlist", "Lista de deseos"],
};

export function libraryStatusLabel(status: LibraryStatus, lang: UiLang) {
  return tri(lang, ...LIBRARY[status]);
}

/** Every library status with its name, for a menu that offers all of them. */
export function libraryStatusLabels(
  lang: UiLang,
): Record<LibraryStatus, string> {
  return Object.fromEntries(
    (Object.keys(LIBRARY) as LibraryStatus[]).map((status) => [
      status,
      libraryStatusLabel(status, lang),
    ]),
  ) as Record<LibraryStatus, string>;
}

export const JOURNEY_STATUSES = [
  "PLANNED",
  "PLAYING",
  "ON_HOLD",
  "COMPLETED",
  "DROPPED",
] as const;

export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

const JOURNEY: Record<JourneyStatus, [string, string, string]> = {
  PLANNED: ["Planejada", "Planned", "Planeada"],
  PLAYING: ["Em andamento", "In progress", "En curso"],
  ON_HOLD: ["Pausada", "Shelved", "Pausada"],
  COMPLETED: ["Concluída", "Completed", "Completada"],
  DROPPED: ["Abandonada", "Dropped", "Abandonada"],
};

export function journeyStatusLabel(status: JourneyStatus, lang: UiLang) {
  return tri(lang, ...JOURNEY[status]);
}

/** Whether a string is one of the five, for a value read off a row. */
export function isJourneyStatus(value: unknown): value is JourneyStatus {
  return typeof value === "string" && value in JOURNEY;
}
