/**
 * What somebody's shelf is made of: genres, developers, publishers.
 *
 * None of this is in the database. A row here knows a game's id and nothing
 * about the game, so the only place that can answer "how much of this library
 * is RPGs" is the catalogue, and the only honest way to ask is to hydrate the
 * ids once and count what comes back.
 *
 * Pure, and free of the server, because the counting is where the judgements
 * live: a game belongs to three genres at once, an unanswered id is not a
 * genre called "unknown", and a studio that published one game somebody played
 * for nine hundred hours is not the same fact as a studio behind nine of their
 * games. Both numbers are kept, and the page says which it is showing.
 */

export type TasteRow = {
  igdb_id: number;
  /** Minutes recorded against the game, zero for a library row never played. */
  minutes: number;
  in_library: boolean;
};

export type TasteGame = {
  id: number;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
};

export type TasteEntry = {
  name: string;
  /** Games of this kind, counted once each. */
  games: number;
  /** Minutes recorded against those games. */
  minutes: number;
};

export type TasteReading = {
  genres: TasteEntry[];
  developers: TasteEntry[];
  publishers: TasteEntry[];
  /** Games the catalogue answered for, which is what the shares are out of. */
  games: number;
  minutes: number;
  /**
   * Ids the catalogue said nothing about. Counted rather than hidden: a
   * reading made of four hundred games out of five hundred should be able to
   * say so instead of quietly being a reading of four hundred.
   */
  unknown: number;
};

type Field = "genres" | "developers" | "publishers";

function top(tally: Map<string, TasteEntry>, howMany: number): TasteEntry[] {
  return [...tally.values()]
    .sort(
      (a, b) =>
        b.games - a.games ||
        b.minutes - a.minutes ||
        a.name.localeCompare(b.name),
    )
    .slice(0, howMany);
}

/**
 * Counts a set of games by what the catalogue says they are.
 *
 * A game counts once per distinct name in a field, so a game the catalogue
 * lists as RPG twice is one RPG, and a game that is both an RPG and an
 * adventure is one of each. That second part is why the shares add up to more
 * than a hundred percent, and why the page says "of the games counted" rather
 * than drawing a pie.
 */
export function readTaste(
  rows: TasteRow[],
  games: TasteGame[],
  howMany = 8,
): TasteReading {
  const catalogue = new Map(games.map((game) => [game.id, game]));
  const tallies: Record<Field, Map<string, TasteEntry>> = {
    genres: new Map(),
    developers: new Map(),
    publishers: new Map(),
  };
  let counted = 0;
  let minutes = 0;
  let unknown = 0;

  for (const row of rows) {
    const game = catalogue.get(row.igdb_id);
    if (!game) {
      unknown += 1;
      continue;
    }
    counted += 1;
    minutes += Math.max(0, row.minutes);
    for (const field of ["genres", "developers", "publishers"] as Field[]) {
      const names = new Set(
        (game[field] ?? [])
          .map((name) => name.trim())
          .filter((name) => name.length > 0),
      );
      for (const name of names) {
        const entry = tallies[field].get(name) ?? {
          name,
          games: 0,
          minutes: 0,
        };
        entry.games += 1;
        entry.minutes += Math.max(0, row.minutes);
        tallies[field].set(name, entry);
      }
    }
  }

  return {
    genres: top(tallies.genres, howMany),
    developers: top(tallies.developers, howMany),
    publishers: top(tallies.publishers, howMany),
    games: counted,
    minutes,
    unknown,
  };
}

/**
 * Whether a reading is worth drawing.
 *
 * Three games is not a taste. Somebody who logged one game would otherwise get
 * a panel saying they are a hundred percent an Action player, which is a
 * sentence about a sample of one dressed up as a sentence about them.
 */
export function tasteIsWorthDrawing(reading: TasteReading): boolean {
  return reading.games >= 5 && reading.genres.length > 0;
}
