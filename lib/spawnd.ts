import spawndCatalogJson from "@/data/spawnd-games.json";
import { tri, type UiLang } from "@/lib/ui-text";

const SPAWND_ORIGIN = "https://www.spawnd.gg";

type SupportedLanguage = UiLang;

type SpawndCatalogGame = {
  spawnd_id: number;
  igdb_id: number | null;
  steam_app_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  embed_description: string | null;
  game_type: string;
  status: string;
  /** Steam's own wording: a date, "Coming soon", "Q4 2026", "2027". */
  release_date: string | null;
  platforms: string[];
  game_url: string;
  embed_url: string;
  stores: Record<string, string>;
  wishlist_url: string | null;
};

type SpawndCatalog = {
  generated_at: string;
  count: number;
  games: SpawndCatalogGame[];
  by_igdb_id?: Record<string, SpawndCatalogGame>;
};

type GetSpawndGameParams = {
  igdbId: number;
  /**
   * The same game on Steam, when IGDB knows it.
   *
   * Every game in spawnd's catalogue carries a Steam app id and only two
   * thirds carry an IGDB one, so a quarter of the demos could never be
   * matched to a page here at all — with the id that would have matched them
   * sitting in both files. This is the second key, tried when the first
   * misses.
   */
  steamAppId?: number | null;
  lang: SupportedLanguage;
};

const spawndCatalog = spawndCatalogJson as SpawndCatalog;

const gamesByIgdbId =
  spawndCatalog.by_igdb_id ??
  Object.fromEntries(
    spawndCatalog.games
      .filter(
        (
          game,
        ): game is SpawndCatalogGame & {
          igdb_id: number;
        } => game.igdb_id !== null,
      )
      .map((game) => [String(game.igdb_id), game]),
  );

const gamesBySteamAppId = new Map<number, SpawndCatalogGame>(
  spawndCatalog.games
    .filter((game) => Number.isSafeInteger(game.steam_app_id))
    .map((game) => [game.steam_app_id as number, game]),
);

function getLocale(lang: SupportedLanguage) {
  return tri(lang, "pt", "en", "es");
}

export function getSpawndGame({
  igdbId,
  steamAppId,
  lang,
}: GetSpawndGameParams) {
  const locale = getLocale(lang);

  const game =
    gamesByIgdbId[String(igdbId)] ??
    (steamAppId ? (gamesBySteamAppId.get(steamAppId) ?? null) : null);

  const available =
    game !== null && Number.isSafeInteger(game.spawnd_id) && game.spawnd_id > 0;

  return {
    available,

    gameUrl: game
      ? `${SPAWND_ORIGIN}/${locale}/games/${encodeURIComponent(game.slug)}`
      : null,

    embedUrl: available
      ? `${SPAWND_ORIGIN}/${locale}/games/embed/${game.spawnd_id}?description=true`
      : null,

    catalogUrl: `${SPAWND_ORIGIN}/${locale}`,

    game: game
      ? {
          id: game.spawnd_id,
          igdbId: game.igdb_id,
          steamAppId: game.steam_app_id,
          name: game.name,
          slug: game.slug,
          description: game.embed_description ?? game.description,
          status: game.status,
          releaseDate: game.release_date ?? null,
          gameType: game.game_type,
          platforms: game.platforms,
          stores: game.stores,
          wishlistUrl: game.wishlist_url,
        }
      : null,
  };
}
