import "server-only";
import { CATALOG_PAGE_SIZE, CATALOG_MAX_PAGE } from "@/lib/catalog-policy";
import type { Series } from "@/lib/series-policy";
import type {
  CatalogGame,
  CatalogSearchFilters,
  CatalogSearchOptions,
  CompanyProfile,
  DiscoveryGames,
  Game,
  GameDetail,
  SeriesGame,
} from "@/lib/igdb";

export function e2eCompanyBySlug(slug: string): CompanyProfile | null {
  if (slug !== "uloggd-e2e") return null;
  return {
    id: 900_100,
    name: "uloggd E2E",
    slug,
    description: "Company fixture for catalogue navigation.",
    countryCode: null,
    foundedTimestamp: null,
    logoUrl: null,
    websites: [],
    parent: null,
    status: null,
    igdbUrl: null,
    publishedCount: 0,
    developedCount: 47,
    published: [],
    developed: [],
  };
}

export const e2eCatalogOptions: CatalogSearchOptions = {
  genres: [
    { id: 12, name: "RPG" },
    { id: 31, name: "Adventure" },
    { id: 5, name: "Shooter" },
  ],
  platforms: [
    { id: 6, name: "PC (Microsoft Windows)", abbreviation: "PC" },
    { id: 48, name: "PlayStation 4", abbreviation: "PS4" },
    { id: 130, name: "Nintendo Switch", abbreviation: "Switch" },
  ],
  themes: [
    { id: 1, name: "Action" },
    { id: 17, name: "Fantasy" },
  ],
  modes: [
    { id: 1, name: "Single player" },
    { id: 2, name: "Multiplayer" },
  ],
  engines: [
    { id: 1, name: "E2E Engine" },
    { id: 2, name: "E2E Engine Next" },
    { id: 3, name: "PowerPoint" },
  ],
  types: [{ id: 0, name: "Main Game" }],
  perspectives: [
    { id: 1, name: "First person" },
    { id: 2, name: "Third person" },
    { id: 4, name: "Side view" },
  ],
  publishers: [{ id: 1, name: "E2E Publisher" }],
};

const allGames: CatalogGame[] = Array.from({ length: 61 }, (_, index) => {
  const number = index + 1;
  const adventure = number % 2 === 1;
  return {
    id: 900_000 + number,
    name: `E2E Game ${String(number).padStart(2, "0")}`,
    slug: `e2e-game-${number}`,
    summary: "Deterministic catalog fixture used by browser tests.",
    rating: 95 - (number % 30),
    ratingCount: 2_000 - number,
    releaseYear: 2026 - (number % 12),
    releaseTimestamp: null,
    hype: 1_000 - number,
    coverUrl: "/logo.jpg",
    heroUrl: null,
    genres: [adventure ? "Adventure" : "RPG"],
    platforms: [adventure ? "Nintendo Switch" : "PC (Microsoft Windows)"],
    platformList: [
      adventure
        ? { id: 130, name: "Nintendo Switch" }
        : { id: 6, name: "PC (Microsoft Windows)" },
    ],
    developers: ["uloggd E2E"],
    publishers: ["E2E Publisher"],
    companySlugs: ["uloggd-e2e", "e2e-publisher"],
    companies: [
      {
        name: "uloggd E2E",
        slug: "uloggd-e2e",
        developer: true,
        publisher: false,
      },
      {
        name: "E2E Publisher",
        slug: "e2e-publisher",
        developer: false,
        publisher: true,
      },
    ],
    primaryCompany: { name: "uloggd E2E", slug: "uloggd-e2e" },
    steamAppId: null,
    themes: [adventure ? "Fantasy" : "Action"],
    modes: [number % 3 ? "Single player" : "Multiplayer"],
    engines: [number % 2 ? "E2E Engine" : "E2E Engine Next"],
    typeName: "Main Game",
    spawndAvailable: number === 1,
  };
});

export function e2ePopularGames(): Game[] {
  return allGames.slice(0, 16);
}

export function e2eDiscoveryGames(): DiscoveryGames {
  return {
    anticipated: allGames.slice(16, 28),
    upcoming: allGames.slice(28, 40),
    hiddenGems: allGames.slice(40, 52),
  };
}

/**
 * A series the fixture games belong to.
 *
 * The first eight are one saga and the rest are standalone, which is what the
 * series readings need to be testable at all: a progress bar over a library is
 * only meaningful if some of the library is in a series and some of it is not.
 *
 * No remakes, ports or editions here. The equivalence rules are a judgement
 * with their own unit tests against fixed rows; what a browser test can say is
 * that the section draws, counts the right number of slots and marks the games
 * that are in the library.
 */
export const e2eSeries: Series = {
  id: 90_001,
  name: "E2E Saga",
  slug: "e2e-saga",
  kind: "collection",
};
const SAGA = [1, 2, 3, 4, 5, 6, 7, 8].map((number) => 900_000 + number);

// Eight additional series exercise the global workspace without changing the saga.
const WORKSPACE_SERIES = Array.from({ length: 8 }, (_, index) => ({
  id: 91_000 + index,
  name:
    index === 0
      ? "Resident E2E"
      : index === 1
        ? "Persona E2E"
        : `Workspace Saga ${index + 1}`,
  slug: `workspace-saga-${index + 1}`,
  kind: "collection" as const,
  ids: [900_010 + index * 3, 900_011 + index * 3, 900_012 + index * 3],
}));

export function e2eSeriesOf(ids: number[]): Map<number, Series> {
  const held = new Map<number, Series>();
  for (const id of ids) if (SAGA.includes(id)) held.set(id, e2eSeries);
  for (const series of WORKSPACE_SERIES)
    for (const id of ids)
      if (series.ids.includes(id) || (series.id === 91_000 && id === 900_060))
        held.set(id, series);
  return held;
}

export function e2eSeriesGames(seriesId: number): SeriesGame[] {
  if (seriesId === e2eSeries.id)
    return SAGA.flatMap((id) => allGames.filter((game) => game.id === id));
  const series = WORKSPACE_SERIES.find((row) => row.id === seriesId);
  if (!series) return [];
  return series.ids
    .flatMap((id) => allGames.filter((game) => game.id === id))
    .map((game, index) => ({
      ...game,
      ...(seriesId === 91_000 && index === 0
        ? {
            remakes: [{ id: 900_060 }],
            variantNames: { 900060: "Resident E2E Remake" },
          }
        : {}),
    }));
}

export function e2eGamesByIds(ids: number[]): Game[] {
  return allGames.filter((game) => ids.includes(game.id));
}

export function e2eGamesBySlugs(slugs: string[]): Game[] {
  const wanted = new Set(slugs);
  return allGames.filter((game) => wanted.has(game.slug));
}

export function e2eGameBySlug(slug: string): GameDetail | null {
  const game = allGames.find((item) => item.slug === slug);
  if (!game) return null;
  return {
    ...game,
    series: e2eSeriesOf([game.id]).get(game.id) ?? null,
    ageRatings: [],
    alternativeCovers:
      game.id === 900_002
        ? [
            { url: "/logo.jpg", source: "default" },
            { url: "/logo.jpg?edition=localized", source: "localized" },
          ]
        : [],
    gallery:
      game.id === 900_001
        ? [
            { id: "e2e-shot", url: "/logo.jpg", kind: "screenshot" },
            { id: "e2e-art", url: "/logo.jpg", kind: "artwork" },
          ]
        : [],
    videos: [],
    events: [],
    publishers: [],
    searchFilters: {
      genres: [],
      // The platforms the stub's games carry, so anything that offers a
      // platform to pick has something to offer under the harness.
      platforms: game.platformList,
      themes: [],
      modes: [],
      engines: [{ id: 1, name: "E2E Engine" }],
      developers: [{ id: 2, name: "uloggd E2E", slug: "uloggd-e2e" }],
      publishers: [{ id: 1, name: "E2E Publisher", slug: "e2e-publisher" }],
    },
    engines: ["E2E Engine"],
    websites: [],
    languages: [],
    related: [],
    timeToBeat: null,
  };
}

export async function searchE2eCatalog(filters: CatalogSearchFilters) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  let games = allGames.filter((game) => {
    const matchesQuery = game.name
      .toLowerCase()
      .includes(filters.query.toLowerCase());
    const matchesGenres =
      !filters.genres.length ||
      filters.genres.some((id) =>
        game.genres.includes(
          e2eCatalogOptions.genres.find((option) => option.id === id)?.name ??
            "",
        ),
      );
    const matchesPlatforms =
      !filters.platforms.length ||
      filters.platforms.some((id) =>
        game.platforms.includes(
          e2eCatalogOptions.platforms.find((option) => option.id === id)
            ?.name ?? "",
        ),
      );
    const matchesPerspectives =
      !filters.perspectives.length ||
      filters.perspectives.some((id) =>
        id === 1 ? game.id % 2 === 0 : id === 2 ? game.id % 2 === 1 : false,
      );
    const matchesEngines =
      !filters.engines.length ||
      filters.engines.some((name) => game.engines.includes(name));
    const currentYear = new Date().getUTCFullYear();
    const matchesRelease =
      filters.releaseStatus === "all" ||
      (filters.releaseStatus === "released"
        ? (game.releaseYear ?? 0) <= currentYear
        : (game.releaseYear ?? 0) > currentYear);
    const matchesRated = !filters.ratedOnly || game.ratingCount > 0;
    const matchesAnticipated = !filters.anticipatedOnly || game.hype > 0;
    return (
      matchesQuery &&
      matchesGenres &&
      matchesPlatforms &&
      matchesEngines &&
      matchesPerspectives &&
      matchesRelease &&
      matchesRated &&
      matchesAnticipated
    );
  });
  if (filters.sort === "name")
    games = games.toSorted((a, b) => a.name.localeCompare(b.name));
  if (filters.sort === "rating")
    games = games.toSorted((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const total = games.length;
  const totalPages = Math.min(
    CATALOG_MAX_PAGE,
    Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  );
  const offset = (filters.page - 1) * CATALOG_PAGE_SIZE;
  return {
    games: games.slice(offset, offset + CATALOG_PAGE_SIZE),
    hasMore: filters.page < totalPages,
    page: filters.page,
    total,
    totalPages,
  };
}
