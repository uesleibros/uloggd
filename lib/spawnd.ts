import spawndCatalog from "@/data/spawnd-games.json";

const SPAWND_ORIGIN = "https://www.spawnd.gg";

type SupportedLanguage = "pt-BR" | "en";

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

type SpawndReference = {
  slug?: string;
  embedId?: number;
};

const catalog = spawndCatalog as SpawndCatalog;

const gamesByIgdbId = new Map<number, SpawndCatalogGame>(
  catalog.games
    .filter(
      (
        game,
      ): game is SpawndCatalogGame & {
        igdb_id: number;
      } => game.igdb_id !== null,
    )
    .map((game) => [game.igdb_id, game]),
);

const gamesBySlug = new Map<string, SpawndCatalogGame>(
  catalog.games.map((game) => [
    game.slug.toLowerCase(),
    game,
  ]),
);

const gamesByName = new Map<string, SpawndCatalogGame>(
  catalog.games.map((game) => [
    normalizeGameName(game.name),
    game,
  ]),
);

function normalizeGameName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spawndReference(
  url: string,
): SpawndReference | null {
  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "https:" ||
      !["spawnd.gg", "www.spawnd.gg"].includes(
        parsed.hostname,
      )
    ) {
      return null;
    }

    const embedMatch = parsed.pathname.match(
      /^\/(?:(?:en|pt|es|ja|zh|-)\/)?games\/embed\/(\d+)\/?$/,
    );

    if (embedMatch) {
      return {
        embedId: Number(embedMatch[1]),
      };
    }

    const gameMatch = parsed.pathname.match(
      /^\/(?:(?:en|pt|es|ja|zh|-)\/)?games\/([^/?#]+)\/?$/,
    );

    if (gameMatch) {
      return {
        slug: decodeURIComponent(gameMatch[1]),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function findGameByWebsite(
  websites: string[],
): SpawndCatalogGame | null {
  for (const website of websites) {
    const reference = spawndReference(website);

    if (!reference) {
      continue;
    }

    if (reference.embedId !== undefined) {
      const game = catalog.games.find(
        (item) =>
          item.spawnd_id === reference.embedId,
      );

      if (game) {
        return game;
      }
    }

    if (reference.slug) {
      const game = gamesBySlug.get(
        reference.slug.toLowerCase(),
      );

      if (game) {
        return game;
      }
    }
  }

  return null;
}

export function getSpawndGame({
  igdbId,
  name,
  websites = [],
  lang,
}: {
  igdbId: number;
  name: string;
  websites?: string[];
  lang: SupportedLanguage;
}) {
  const locale = lang === "pt-BR" ? "pt" : "en";

  const game =
    gamesByIgdbId.get(igdbId) ??
    findGameByWebsite(websites) ??
    gamesByName.get(normalizeGameName(name)) ??
    null;

  const available =
    game !== null &&
    Number.isSafeInteger(game.spawnd_id) &&
    game.spawnd_id > 0;

  return {
    available,

    gameUrl: game
      ? `${SPAWND_ORIGIN}/${locale}/games/${encodeURIComponent(
          game.slug,
        )}`
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
          description:
            game.embed_description ??
            game.description,
          platforms: game.platforms,
          status: game.status,
          stores: game.stores,
          wishlistUrl: game.wishlist_url,
        }
      : null,
  };
}
