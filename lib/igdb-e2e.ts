import "server-only";
import type {
  CatalogGame,
  CatalogSearchFilters,
  CatalogSearchOptions,
  DiscoveryGames,
  Game,
  GameDetail,
  GenreCollection,
} from "@/lib/igdb";

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
    developers: ["uloggd E2E"],
    themes: [adventure ? "Fantasy" : "Action"],
    modes: [number % 3 ? "Single player" : "Multiplayer"],
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

export function e2eGenreCollections(): GenreCollection[] {
  return [
    {
      id: 12,
      name: { "pt-BR": "RPG", en: "RPG" },
      games: allGames.filter((game) => game.genres.includes("RPG")),
    },
    {
      id: 31,
      name: { "pt-BR": "Aventura", en: "Adventure" },
      games: allGames.filter((game) => game.genres.includes("Adventure")),
    },
  ];
}

export function e2eGamesByIds(ids: number[]): Game[] {
  return allGames.filter((game) => ids.includes(game.id));
}

export function e2eGameBySlug(slug: string): GameDetail | null {
  const game = allGames.find((item) => item.slug === slug);
  if (!game) return null;
  return {
    ...game,
    ageRatings: [],
    alternativeCovers: [],
    gallery: [],
    videos: [],
    events: [],
    publishers: [],
    searchFilters: {
      genres: [],
      platforms: [],
      themes: [],
      modes: [],
      publishers: [],
    },
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
  const totalPages = Math.max(1, Math.ceil(total / 24));
  const offset = (filters.page - 1) * 24;
  return {
    games: games.slice(offset, offset + 24),
    hasMore: filters.page < totalPages,
    page: filters.page,
    total,
    totalPages,
  };
}
