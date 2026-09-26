import "server-only";

/**
 * The columns a copy is read with, shared by the two routes that read them.
 *
 * Here rather than exported from a route file: a route module may only export
 * the handlers and a handful of config names, and Next fails the build on
 * anything else.
 */
export const COPY_COLUMNS = `id, igdb_id, game_slug, platform_id, platform_name,
  storefront, ownership, medium, edition, region, note, acquired_on,
  created_at, updated_at`;
