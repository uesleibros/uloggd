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
