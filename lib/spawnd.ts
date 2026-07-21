import spawndCatalogJson from "@/data/spawnd-games.json";
import type { UiLang } from "@/lib/ui-text";

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

function getLocale(lang: SupportedLanguage) {
  return lang === "pt-BR" ? "pt" : "en";
}

export function getSpawndGame({ igdbId, lang }: GetSpawndGameParams) {
  const locale = getLocale(lang);

  const game = gamesByIgdbId[String(igdbId)] ?? null;

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
          gameType: game.game_type,
          platforms: game.platforms,
          stores: game.stores,
          wishlistUrl: game.wishlist_url,
        }
      : null,
  };
}
