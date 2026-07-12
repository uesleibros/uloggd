import "server-only";

type TwitchToken = { access_token: string; expires_in: number };
type IgdbImage = { image_id: string };
type IgdbGameResponse = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  total_rating?: number;
  total_rating_count?: number;
  first_release_date?: number;
  cover?: IgdbImage;
  artworks?: IgdbImage[];
  screenshots?: IgdbImage[];
  genres?: { name: string }[];
  platforms?: { name: string }[];
  alternative_names?: { name: string }[];
  game_type?: number;
};

export type GameSearchResult = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string;
  releaseYear: number | null;
  platforms: string[];
  kind: "game" | "dlc" | "expansion" | "edition";
};

export type Game = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  rating: number | null;
  ratingCount: number;
  releaseYear: number | null;
  coverUrl: string;
  heroUrl: string | null;
  genres: string[];
};

let tokenCache: { value: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Missing Twitch/IGDB credentials");

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`Twitch authentication failed (${response.status})`);
  const data = (await response.json()) as TwitchToken;
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

function imageUrl(imageId: string, size: "cover_big" | "1080p") {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

function normalize(game: IgdbGameResponse): Game {
  const hero = game.artworks?.[0] ?? game.screenshots?.[0];
  return {
    id: game.id,
    name: game.name,
    slug: game.slug,
    summary: game.summary ?? "",
    rating:
      typeof game.total_rating === "number"
        ? Math.round(game.total_rating)
        : null,
    ratingCount: game.total_rating_count ?? 0,
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
    coverUrl: game.cover
      ? imageUrl(game.cover.image_id, "cover_big")
      : "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png",
    heroUrl: hero ? imageUrl(hero.image_id, "1080p") : null,
    genres: game.genres?.map((genre) => genre.name).slice(0, 2) ?? [],
  };
}

async function queryGamesRaw(body: string) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Twitch client ID");
  const token = await getAccessToken();
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
    next: { revalidate: 3600 },
  });
  if (!response.ok)
    throw new Error(
      `IGDB request failed (${response.status}): ${await response.text()}`,
    );
  return (await response.json()) as IgdbGameResponse[];
}

async function queryGames(body: string) {
  return (await queryGamesRaw(body)).map(normalize);
}

function escapeIgdb(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function searchRelevance(game: IgdbGameResponse, query: string) {
  const input = query.toLocaleLowerCase();
  const words = input.split(/\s+/).filter(Boolean);
  const names = [
    game.name,
    ...(game.alternative_names?.map(({ name }) => name) ?? []),
  ].map((name) => name.toLocaleLowerCase());

  const nameScore = Math.max(
    ...names.map((name) => {
      if (name === input) return 100;
      if (name.startsWith(input)) return 82;
      if (name.includes(input)) return 62;
      return (
        (words.filter((word) => name.includes(word)).length / words.length) * 42
      );
    }),
  );
  return nameScore + Math.min((game.total_rating_count ?? 0) / 100, 20);
}

function searchKind(gameType?: number): GameSearchResult["kind"] {
  if (gameType === 1) return "dlc";
  if (gameType === 2 || gameType === 4) return "expansion";
  if (gameType === 10 || gameType === 11 || gameType === 14) return "edition";
  return "game";
}

export async function searchGames(
  rawQuery: string,
): Promise<GameSearchResult[]> {
  const query = rawQuery.trim().replace(/\s+/g, " ").slice(0, 80);
  const words = query
    .split(" ")
    .map(escapeIgdb)
    .filter((word) => word.length >= 2)
    .slice(0, 6);
  if (!words.length) return [];

  const nameFilter = words.map((word) => `name ~ *"${word}"*`).join(" & ");
  const alternativeFilter = words
    .map((word) => `alternative_names.name ~ *"${word}"*`)
    .join(" & ");
  const games = await queryGamesRaw(`
    fields name,slug,first_release_date,cover.image_id,platforms.name,
      alternative_names.name,total_rating_count,game_type;
    where (${nameFilter} | ${alternativeFilter}) & cover != null;
    sort total_rating_count desc;
    limit 20;
  `);

  return games
    .sort((a, b) => searchRelevance(b, query) - searchRelevance(a, query))
    .slice(0, 12)
    .map((game) => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      coverUrl: game.cover
        ? imageUrl(game.cover.image_id, "cover_big")
        : "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png",
      releaseYear: game.first_release_date
        ? new Date(game.first_release_date * 1000).getUTCFullYear()
        : null,
      platforms: game.platforms?.map(({ name }) => name).slice(0, 3) ?? [],
      kind: searchKind(game.game_type),
    }));
}

export async function getPopularGames(): Promise<Game[]> {
  return queryGames(`
    fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name;
    where cover != null & total_rating_count > 500 & game_type = (0,8,9);
    sort total_rating_count desc;
    limit 10;
  `);
}
