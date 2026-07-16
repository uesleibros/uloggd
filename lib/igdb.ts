import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { resolveAgeRating } from "@/lib/age-ratings";

const CACHE_MINUTES = 60;
const CACHE_HOURS = 60 * CACHE_MINUTES;

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
  hypes?: number;
  game_localizations?: { cover?: IgdbImage }[];
  version_parent?: {
    id: number;
    cover?: IgdbImage;
    game_localizations?: { cover?: IgdbImage }[];
  };
  involved_companies?: {
    developer?: boolean;
    publisher?: boolean;
    company?: { name: string };
  }[];
  videos?: { video_id: string; name?: string }[];
  themes?: { name: string }[];
  game_modes?: { name: string }[];
  age_ratings?: {
    organization?: { name: string };
    rating_category?: { rating: string };
  }[];
  websites?: { url: string }[];
  language_supports?: {
    language?: { name: string; native_name?: string };
    language_support_type?: { name: string };
  }[];
  similar_games?: IgdbGameResponse[];
  dlcs?: IgdbGameResponse[];
  expansions?: IgdbGameResponse[];
  standalone_expansions?: IgdbGameResponse[];
  ports?: IgdbGameResponse[];
  remakes?: IgdbGameResponse[];
  remasters?: IgdbGameResponse[];
};

type IgdbEventResponse = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  start_time?: number;
  end_time?: number;
  live_stream_url?: string;
  event_logo?: IgdbImage;
};

type IgdbTimeToBeatResponse = {
  hastily?: number;
  normally?: number;
  completely?: number;
  count?: number;
};

export type GameSearchResult = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string;
  releaseYear: number | null;
  platforms: string[];
  kind: "game" | "dlc" | "expansion" | "edition";
  spawndAvailable?: boolean;
};

export type Game = {
  id: number;
  name: string;
  slug: string;
  summary: string;
  rating: number | null;
  ratingCount: number;
  releaseYear: number | null;
  releaseTimestamp: number | null;
  hype: number;
  coverUrl: string;
  heroUrl: string | null;
  genres: string[];
  platforms: string[];
  developers: string[];
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
    releaseTimestamp: game.first_release_date ?? null,
    hype: game.hypes ?? 0,
    coverUrl: game.cover
      ? imageUrl(game.cover.image_id, "cover_big")
      : "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png",
    heroUrl: hero ? imageUrl(hero.image_id, "1080p") : null,
    genres: game.genres?.map((genre) => genre.name).slice(0, 2) ?? [],
    platforms: game.platforms?.map((platform) => platform.name) ?? [],
    developers:
      game.involved_companies
        ?.filter((item) => item.developer && item.company?.name)
        .map((item) => item.company!.name) ?? [],
  };
}

async function queryIgdbRaw<T>(
  endpoint: string,
  body: string,
  revalidate = CACHE_HOURS,
): Promise<T[]> {
  const run = unstable_cache(
    async () => {
      const clientId = process.env.TWITCH_CLIENT_ID;
      if (!clientId) throw new Error("Missing Twitch client ID");
      const token = await getAccessToken();
      const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
        body,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`IGDB request failed (${response.status})`);
      }
      return (await response.json()) as T[];
    },
    ["igdb", endpoint, body],
    { revalidate },
  );

  return run();
}

async function queryGamesRaw(body: string, revalidate?: number) {
  return queryIgdbRaw<IgdbGameResponse>("games", body, revalidate);
}

async function queryGames(body: string, revalidate?: number) {
  return (await queryGamesRaw(body, revalidate)).map(normalize);
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
  const games = await queryGamesRaw(
    `
    fields name,slug,first_release_date,cover.image_id,platforms.name,
      alternative_names.name,total_rating_count,game_type;
    where (${nameFilter} | ${alternativeFilter}) & cover != null;
    sort total_rating_count desc;
    limit 20;
  `,
    15 * CACHE_MINUTES,
  );

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
  return queryGames(
    `
    fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name;
    where cover != null & total_rating_count > 500 & game_type = (0,8,9);
    sort total_rating_count desc;
    limit 16;
  `,
    6 * CACHE_HOURS,
  );
}

export async function getGamesByIds(ids: number[]): Promise<Game[]> {
  const safeIds = [...new Set(ids)]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
  if (!safeIds.length) return [];
  const batches = Array.from(
    { length: Math.ceil(safeIds.length / 100) },
    (_, index) => safeIds.slice(index * 100, index * 100 + 100),
  );
  return (
    await Promise.all(
      batches.map((batch) =>
        queryGames(
          `
          fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name;
          where id = (${batch.join(",")});
          limit ${batch.length};
        `,
          12 * CACHE_HOURS,
        ),
      ),
    )
  ).flat();
}

export type DiscoveryGames = {
  anticipated: Game[];
  upcoming: Game[];
  hiddenGems: Game[];
};

export type GenreCollection = {
  id: number;
  name: { "pt-BR": string; en: string };
  games: Game[];
};

export type GameDetail = Game & {
  ageRatings: {
    organization: string;
    region: string;
    rating: string;
    minimumAge: number | null;
    imageUrl: string | null;
  }[];
  alternativeCovers: {
    url: string;
    source: "default" | "localized" | "edition";
  }[];
  gallery: { id: string; url: string; kind: "screenshot" | "artwork" }[];
  videos: { id: string; name: string }[];
  events: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    startTimestamp: number | null;
    endTimestamp: number | null;
    liveStreamUrl: string | null;
    imageUrl: string | null;
  }[];
  publishers: string[];
  themes: string[];
  modes: string[];
  websites: string[];
  languages: {
    name: string;
    nativeName: string | null;
    support: string[];
  }[];
  related: {
    kind: "expansions" | "editions" | "remakes" | "similar";
    games: Game[];
  }[];
  timeToBeat: {
    hastily: number | null;
    normally: number | null;
    completely: number | null;
    count: number;
  } | null;
};

export const getGameBySlug = cache(async function getGameBySlug(
  slug: string,
): Promise<GameDetail | null> {
  if (!/^[a-z0-9-]{1,255}$/.test(slug)) return null;
  const games = await queryGamesRaw(
    `
    fields name,slug,summary,hypes,total_rating,total_rating_count,first_release_date,
      cover.image_id,artworks.image_id,screenshots.image_id,genres.name,
      platforms.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,
      videos.video_id,videos.name,themes.name,game_modes.name,websites.url,
      age_ratings.organization.name,age_ratings.rating_category.rating,
      language_supports.language.name,language_supports.language.native_name,language_supports.language_support_type.name,
      similar_games.name,similar_games.slug,similar_games.first_release_date,similar_games.total_rating,similar_games.total_rating_count,similar_games.cover.image_id,similar_games.genres.name,
      dlcs.name,dlcs.slug,dlcs.first_release_date,dlcs.total_rating,dlcs.total_rating_count,dlcs.cover.image_id,dlcs.genres.name,
      expansions.name,expansions.slug,expansions.first_release_date,expansions.total_rating,expansions.total_rating_count,expansions.cover.image_id,expansions.genres.name,
      standalone_expansions.name,standalone_expansions.slug,standalone_expansions.first_release_date,standalone_expansions.total_rating,standalone_expansions.total_rating_count,standalone_expansions.cover.image_id,standalone_expansions.genres.name,
      ports.name,ports.slug,ports.first_release_date,ports.total_rating,ports.total_rating_count,ports.cover.image_id,ports.genres.name,
      remakes.name,remakes.slug,remakes.first_release_date,remakes.total_rating,remakes.total_rating_count,remakes.cover.image_id,remakes.genres.name,
      remasters.name,remasters.slug,remasters.first_release_date,remasters.total_rating,remasters.total_rating_count,remasters.cover.image_id,remasters.genres.name,
      game_localizations.cover.image_id,version_parent.id,version_parent.cover.image_id,
      version_parent.game_localizations.cover.image_id;
    where slug = "${slug}";
    limit 1;
  `,
    12 * CACHE_HOURS,
  );
  const raw = games[0];
  if (!raw) return null;

  const coverOptions = new Map<
    string,
    GameDetail["alternativeCovers"][number]
  >();
  const addCover = (
    cover: IgdbImage | undefined,
    source: GameDetail["alternativeCovers"][number]["source"],
  ) => {
    if (cover?.image_id && !coverOptions.has(cover.image_id)) {
      coverOptions.set(cover.image_id, {
        url: imageUrl(cover.image_id, "cover_big"),
        source,
      });
    }
  };
  addCover(raw.cover, "default");
  raw.game_localizations?.forEach((item) => addCover(item.cover, "localized"));
  addCover(raw.version_parent?.cover, "edition");
  raw.version_parent?.game_localizations?.forEach((item) =>
    addCover(item.cover, "edition"),
  );

  const rootId = raw.version_parent?.id ?? raw.id;
  const [siblings, events, timeToBeatRows] = await Promise.all([
    queryGamesRaw(
      `
        fields name,slug,first_release_date,total_rating,total_rating_count,cover.image_id,genres.name,game_localizations.cover.image_id;
        where version_parent = ${rootId};
        limit 500;
      `,
      12 * CACHE_HOURS,
    ).catch(() => []),
    queryIgdbRaw<IgdbEventResponse>(
      "events",
      `
        fields name,slug,description,start_time,end_time,live_stream_url,event_logo.image_id;
        where games = [${raw.id}];
        sort start_time desc;
        limit 12;
      `,
      6 * CACHE_HOURS,
    ).catch(() => []),
    queryIgdbRaw<IgdbTimeToBeatResponse>(
      "game_time_to_beats",
      `
        fields hastily,normally,completely,count;
        where game_id = ${raw.id};
        limit 1;
      `,
      24 * CACHE_HOURS,
    ).catch(() => []),
  ]);
  siblings.forEach((game) => {
    addCover(game.cover, "edition");
    game.game_localizations?.forEach((item) => addCover(item.cover, "edition"));
  });

  const time = timeToBeatRows[0];

  const gallery = [
    ...(raw.screenshots ?? []).map((image) => ({
      id: image.image_id,
      url: imageUrl(image.image_id, "1080p"),
      kind: "screenshot" as const,
    })),
    ...(raw.artworks ?? []).map((image) => ({
      id: image.image_id,
      url: imageUrl(image.image_id, "1080p"),
      kind: "artwork" as const,
    })),
  ];
  const usable = (games: IgdbGameResponse[] | undefined) =>
    (games ?? [])
      .filter((game) => game.id !== raw.id && game.cover?.image_id)
      .map(normalize);
  const expansions = usable([
    ...(raw.dlcs ?? []),
    ...(raw.expansions ?? []),
    ...(raw.standalone_expansions ?? []),
  ]).slice(0, 12);
  const editions = usable([...siblings, ...(raw.ports ?? [])]).slice(0, 12);
  const remakes = usable([
    ...(raw.remakes ?? []),
    ...(raw.remasters ?? []),
  ]).slice(0, 12);
  const similar = usable(raw.similar_games).slice(0, 12);
  const related: GameDetail["related"] = [
    { kind: "expansions", games: expansions },
    { kind: "editions", games: editions },
    { kind: "remakes", games: remakes },
    { kind: "similar", games: similar },
  ];
  const languages = new Map<string, GameDetail["languages"][number]>();
  for (const entry of raw.language_supports ?? []) {
    if (!entry.language?.name || !entry.language_support_type?.name) continue;
    const current = languages.get(entry.language.name) ?? {
      name: entry.language.name,
      nativeName: entry.language.native_name ?? null,
      support: [],
    };
    if (!current.support.includes(entry.language_support_type.name)) {
      current.support.push(entry.language_support_type.name);
    }
    languages.set(entry.language.name, current);
  }

  return {
    ...normalize(raw),
    ageRatings: (raw.age_ratings ?? [])
      .filter(
        (
          item,
        ): item is {
          organization: { name: string };
          rating_category: { rating: string };
        } => Boolean(item.organization?.name && item.rating_category?.rating),
      )
      .map((item) =>
        resolveAgeRating(item.organization.name, item.rating_category.rating),
      )
      .filter((item): item is NonNullable<typeof item> => item !== null),
    alternativeCovers: [...coverOptions.values()].slice(0, 24),
    gallery,
    videos: (raw.videos ?? [])
      .filter((video) => /^[a-zA-Z0-9_-]{6,20}$/.test(video.video_id))
      .slice(0, 6)
      .map((video) => ({ id: video.video_id, name: video.name || raw.name })),
    events: events.map((event) => ({
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description ?? null,
      startTimestamp: event.start_time ?? null,
      endTimestamp: event.end_time ?? null,
      liveStreamUrl: event.live_stream_url?.startsWith("https://")
        ? event.live_stream_url
        : null,
      imageUrl: event.event_logo
        ? imageUrl(event.event_logo.image_id, "1080p")
        : null,
    })),
    publishers:
      raw.involved_companies
        ?.filter((item) => item.publisher && item.company?.name)
        .map((item) => item.company!.name) ?? [],
    themes: raw.themes?.map((theme) => theme.name) ?? [],
    modes: raw.game_modes?.map((mode) => mode.name) ?? [],
    websites: (raw.websites ?? [])
      .map((website) => website.url)
      .filter((url) => url.startsWith("https://"))
      .slice(0, 8),
    languages: [...languages.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    related: related.filter((group) => group.games.length > 0),
    timeToBeat: time
      ? {
          hastily: time.hastily ?? null,
          normally: time.normally ?? null,
          completely: time.completely ?? null,
          count: time.count ?? 0,
        }
      : null,
  };
});

export async function getDiscoveryGames(): Promise<DiscoveryGames> {
  // A day boundary keeps the IGDB request body stable so the data cache can hit.
  const now = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) * 24 * 60 * 60;
  const inFourMonths = now + 60 * 60 * 24 * 120;
  const twoYearsAgo = now - 60 * 60 * 24 * 365 * 2;
  const fields =
    "name,slug,summary,hypes,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name";

  const [anticipated, upcoming, hiddenGems] = await Promise.all([
    queryGames(
      `
      fields ${fields};
      where cover != null & first_release_date > ${now} & hypes > 5 & game_type = (0,8,9);
      sort hypes desc;
      limit 12;
    `,
      6 * CACHE_HOURS,
    ),
    queryGames(
      `
      fields ${fields};
      where cover != null & first_release_date > ${now} & first_release_date < ${inFourMonths} & game_type = (0,8,9);
      sort first_release_date asc;
      limit 12;
    `,
      6 * CACHE_HOURS,
    ),
    queryGames(
      `
      fields ${fields};
      where cover != null & first_release_date < ${twoYearsAgo} & total_rating >= 80 & total_rating_count >= 50 & total_rating_count < 350 & game_type = 0 & franchises = null & collections = null;
      sort total_rating desc;
      limit 12;
    `,
      6 * CACHE_HOURS,
    ),
  ]);

  return { anticipated, upcoming, hiddenGems };
}

export async function getGenreCollections(): Promise<GenreCollection[]> {
  const genres = [
    { id: 12, name: { "pt-BR": "RPG", en: "RPG" } },
    { id: 5, name: { "pt-BR": "Tiro", en: "Shooter" } },
    { id: 31, name: { "pt-BR": "Aventura", en: "Adventure" } },
    { id: 15, name: { "pt-BR": "Estratégia", en: "Strategy" } },
    { id: 32, name: { "pt-BR": "Independentes", en: "Indie" } },
  ] as const;
  const games = await Promise.all(
    genres.map((genre) =>
      queryGames(
        `
        fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name;
        where cover != null & genres = (${genre.id}) & total_rating_count >= 40 & game_type = 0;
        sort total_rating_count desc;
        limit 40;
      `,
        12 * CACHE_HOURS,
      ),
    ),
  );
  return genres.map((genre, index) => ({ ...genre, games: games[index] }));
}
