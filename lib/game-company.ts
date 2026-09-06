/**
 * The studio that made a game is the useful authorship credit on compact
 * cards. A publisher is only the fallback for the IGDB rows that do not name
 * a developer.
 */
export function primaryGameCompany(game: {
  developers?: readonly string[] | null;
  publishers?: readonly string[] | null;
}) {
  return game.developers?.[0] ?? game.publishers?.[0] ?? null;
}

/**
 * The one line of small print under a game's name, wherever a card appears.
 *
 * Stated once because it was stated three times and had drifted: some shelves
 * read "1997 · Square" and others "1997 · Role-playing", depending on whether
 * whoever wrote that query happened to ask IGDB for the companies. Two cards
 * side by side answering different questions is worse than either answer.
 *
 * It is the company, never the genre. Genres are how you find a game you have
 * not played; who made it is what tells two similarly named games apart, and
 * it is the credit the studio is owed. When IGDB names nobody, the year stands
 * alone rather than a genre standing in for an author.
 */
export function gameMetaLine(game: {
  releaseYear?: number | null;
  developers?: readonly string[] | null;
  publishers?: readonly string[] | null;
}): string {
  return [game.releaseYear, primaryGameCompany(game)]
    .filter(Boolean)
    .join(" · ");
}

/**
 * A platform named the way people name it.
 *
 * IGDB spells the obvious ones out in full: "PC (Microsoft Windows)", "Mac
 * (Apple Macintosh)". The parenthetical is the part nobody says, and on a
 * 132px catalogue card it was the difference between a line that fit and a
 * line cut after the year.
 */
export function shortPlatform(name: string | undefined) {
  return name ? name.replace(/\s*\([^)]*\)\s*$/, "") : name;
}
