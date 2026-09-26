import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { resolveAgeRating } from "@/lib/age-ratings";
import type { UiLang } from "@/lib/ui-text";
import { E2E_ENABLED } from "@/lib/e2e";
import { createBudget } from "@/igdb-budget";

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
  genres?: { id: number; name: string }[];
  platforms?: { id: number; name: string }[];
  alternative_names?: { name: string }[];
  game_type?: number | { id: number; type: string };
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
    company?: { id: number; name: string; slug?: string };
  }[];
  videos?: { video_id: string; name?: string }[];
  themes?: { id: number; name: string }[];
  game_modes?: { id: number; name: string }[];
  game_engines?: { id: number; name: string }[];
  age_ratings?: {
    organization?: { name: string };
    rating_category?: { rating: string };
  }[];
  websites?: { url: string }[];
  external_games?: { uid?: string; external_game_source?: number }[];
  language_supports?: {
    language?: { name: string; native_name?: string; locale?: string };
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
  /** The second key spawnd is matched on; see `Game.steamAppId`. */
  steamAppId: number | null;
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
  publishers: string[];
  /**
   * The slugs behind those names, for anything that has to link to a company
   * rather than print it. Every game query asks for these now: a card shows a
   * name, and the name is a link to the studio's page.
   */
  companySlugs: string[];
  /**
   * The one a card prints, with the address behind it.
   *
   * `developers` and `publishers` are names and `companySlugs` is an unordered
   * set of every slug on the game, so nothing paired the name a card shows
   * with the page it belongs to: the credit under a cover was the one piece
   * of a game card that led nowhere. Same choice `primaryGameCompany` makes,
   * the first developer or else the first publisher, resolved once here.
   */
  primaryCompany: { name: string; slug: string } | null;
  /**
   * The game on Steam, when IGDB knows it.
   *
   * spawnd's catalogue carries a Steam app id for every one of its games and
   * an IGDB id for two thirds of them, so this is the second way to tell
   * whether a demo exists here: a quarter of the catalogue could never be
   * matched at all, and every one of those had a Steam id sitting in both
   * files. IGDB's `external_game_source` of 1 is Steam; the old `category`
   * field answers nothing on these rows any more.
   */
  steamAppId: number | null;
};

export type CatalogOption = {
  id: number;
  name: string;
  abbreviation?: string | null;
  group?: string | null;
  generation?: number | null;
};

export type CatalogSearchFilters = {
  query: string;
  genres: number[];
  platforms: number[];
  themes: number[];
  modes: number[];
  /** Human-readable names keep shared search URLs understandable. */
  engines: string[];
  types: number[];
  perspectives: number[];
  publishers: number[];
  /** Narrows a selected company to one role; "any" keeps both. */
  publisherRole: "any" | "publisher" | "developer";
  releaseStatus: "all" | "released" | "upcoming";
  ratedOnly: boolean;
  anticipatedOnly: boolean;
  yearFrom: number | null;
  yearTo: number | null;
  ratingMin: number | null;
  ratingCountMin: number | null;
  sort: "popular" | "rating" | "newest" | "oldest" | "hype" | "name";
  page: number;
};

export type CatalogGame = Game & {
  themes: string[];
  modes: string[];
  engines: string[];
  typeName: string | null;
  spawndAvailable?: boolean;
};

export type CatalogSearchOptions = {
  genres: CatalogOption[];
  platforms: CatalogOption[];
  themes: CatalogOption[];
  modes: CatalogOption[];
  engines: CatalogOption[];
  types: CatalogOption[];
  perspectives: CatalogOption[];
  publishers: CatalogOption[];
};

let tokenCache: { value: string; expiresAt: number } | null = null;

/**
 * How long to wait for Twitch or IGDB before giving up.
 *
 * `fetch` has no limit of its own that matters here (Node waits minutes for
 * headers), so an IGDB that accepted the connection and never answered held
 * the page, and the memory for it, that long. Ten seconds is far past a slow
 * answer; past it, the readers that decorate a page fall back to less and the
 * ones that are the page say it could not be loaded.
 */
const IGDB_TIMEOUT_MS = 10_000;

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
    signal: AbortSignal.timeout(IGDB_TIMEOUT_MS),
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

function imageUrl(
  imageId: string,
  size: "cover_big" | "1080p" | "logo_med" | "thumb" | "original",
) {
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
    publishers:
      game.involved_companies
        ?.filter((item) => item.publisher && item.company?.name)
        .map((item) => item.company!.name) ?? [],
    companySlugs: [
      ...new Set(
        game.involved_companies
          ?.map((item) => item.company?.slug)
          .filter((slug): slug is string => Boolean(slug)) ?? [],
      ),
    ],
    steamAppId:
      (game.external_games ?? [])
        .map((entry) =>
          entry.external_game_source === 1 && entry.uid
            ? Number(entry.uid)
            : null,
        )
        .find((id): id is number => Number.isSafeInteger(id) && id! > 0) ??
      null,
    primaryCompany:
      (game.involved_companies ?? [])
        // A developer first, then anybody: the same order the name follows.
        .slice()
        .sort(
          (a, b) => Number(Boolean(b.developer)) - Number(Boolean(a.developer)),
        )
        .map((item) =>
          item.company?.name && item.company?.slug
            ? { name: item.company.name, slug: item.company.slug }
            : null,
        )
        .find((one): one is { name: string; slug: string } => one !== null) ??
      null,
  };
}

/**
 * IGDB allows four requests per second, per client id.
 *
 * The budget belongs to the credentials, and every worker in the cluster uses
 * the same ones, so in the cluster the primary keeps the one schedule and each
 * request asks it for a slot (see igdb-budget.js and server.js). That lets an
 * idle site send a page's handful of lookups at once, where a fixed 750ms gap
 * per worker made the fourth one wait two seconds, without letting three
 * workers burst in the same second, which is what used to earn the 429s.
 *
 * A process on its own (next start, next dev) has the whole budget to itself.
 * A worker whose primary does not answer falls back to its third, spaced out,
 * which is slow but can never exceed the limit.
 */
const RATE = Math.max(1, Number(process.env.IGDB_REQUESTS_PER_SECOND) || 4);
const SHARERS = Math.max(1, Number(process.env.WEB_CONCURRENCY) || 3);
const clustered =
  Boolean(process.env.NODE_UNIQUE_ID) && typeof process.send === "function";
const ownBudget = clustered
  ? createBudget({ limit: 1, windowMs: Math.ceil((1000 * SHARERS) / RATE) })
  : createBudget({ limit: RATE });

const slotRequests = new Map<number, (wait: number) => void>();
let nextSlotRequest = 0;
if (clustered)
  process.on(
    "message",
    (message: { type?: string; id?: number; wait?: number }) => {
      if (message?.type !== "uloggd:igdb-slot" || message.id === undefined)
        return;
      slotRequests.get(message.id)?.(Number(message.wait) || 0);
    },
  );

function clusterWait(): Promise<number> {
  if (!clustered || !process.connected)
    return Promise.resolve(ownBudget.take());
  const id = (nextSlotRequest += 1);
  return new Promise((resolve) => {
    const fallback = setTimeout(() => {
      slotRequests.delete(id);
      resolve(ownBudget.take());
    }, 2000);
    slotRequests.set(id, (wait) => {
      clearTimeout(fallback);
      slotRequests.delete(id);
      resolve(wait);
    });
    process.send!({ type: "uloggd:igdb-slot", id }, undefined, {}, (error) => {
      if (!error) return;
      clearTimeout(fallback);
      slotRequests.delete(id);
      resolve(ownBudget.take());
    });
  });
}

async function throttleIgdb() {
  const wait = await clusterWait();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/** Tells every worker to send nothing for `ms`, after IGDB answered 429. */
function holdIgdb(ms: number) {
  ownBudget.hold(ms);
  if (clustered && process.connected)
    process.send!({ type: "uloggd:igdb-hold", ms }, undefined, {}, () => {
      // Nothing to do: the worker is on its way out.
    });
}

async function igdbFetch<T>(endpoint: string, body: string): Promise<T[]> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!clientId) throw new Error("Missing Twitch client ID");
  const token = await getAccessToken();
  for (let attempt = 0; ; attempt += 1) {
    await throttleIgdb();
    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(IGDB_TIMEOUT_MS),
    });
    if (response.status === 429 && attempt < 5) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay =
        (Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : // Exponential rather than linear. A 429 means the budget is already
            // spent, and the old 400ms step spent its three attempts inside the
            // same second that rejected the first one.
            400 * 2 ** attempt) +
        Math.random() * 200;
      // Hold everyone back, not just this call. Anything else queued would
      // otherwise walk into the same wall on schedule.
      holdIgdb(delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 600);
      throw new Error(`IGDB request failed (${response.status}): ${detail}`);
    }
    return (await response.json()) as T[];
  }
}

// Concurrent identical queries share one upstream request.
const inflightQueries = new Map<string, Promise<unknown>>();

async function queryIgdbRaw<T>(
  endpoint: string,
  body: string,
  revalidate = CACHE_HOURS,
): Promise<T[]> {
  const run = unstable_cache(
    () => igdbFetch<T>(endpoint, body),
    ["igdb", endpoint, body],
    { revalidate },
  );
  const key = `${endpoint}\n${body}`;
  const existing = inflightQueries.get(key);
  if (existing) return existing as Promise<T[]>;
  const promise = run().finally(() => inflightQueries.delete(key));
  inflightQueries.set(key, promise);
  return promise;
}

/**
 * Several queries in one request, which is what IGDB's `multiquery` is for.
 *
 * The budget is four requests a second for the whole deployment, so a read
 * that pages through its answer pays for every page and waits between them:
 * Nintendo's releases-per-year chart is six pages of five hundred, and it
 * took nine seconds of a page that otherwise had everything it needed. Ten
 * sub-queries fit in one request, and one request is what the budget sees.
 */
async function queryIgdbMultiParts<T>(
  parts: { endpoint: string; body: string }[],
  revalidate = CACHE_HOURS,
): Promise<{ result: T[]; count: number | null }[]> {
  const answers: { result: T[]; count: number | null }[] = [];
  for (let start = 0; start < parts.length; start += 10) {
    const group = parts.slice(start, start + 10);
    const body = group
      .map(
        (part, index) =>
          `query ${part.endpoint} "q${index}" {
${part.body.trim()}
};`,
      )
      .join("\n");
    const rows = await queryIgdbRaw<{
      name: string;
      result?: T[];
      count?: number;
    }>("multiquery", body, revalidate);
    const byName = new Map(rows.map((row) => [row.name, row]));
    for (let index = 0; index < group.length; index += 1) {
      const row = byName.get(`q${index}`);
      // A `/count` endpoint answers with a number rather than rows.
      answers.push({
        result: row?.result ?? [],
        count: typeof row?.count === "number" ? row.count : null,
      });
    }
  }
  return answers;
}

async function queryIgdbMulti<T>(
  parts: { endpoint: string; body: string }[],
  revalidate = CACHE_HOURS,
): Promise<T[][]> {
  return (await queryIgdbMultiParts<T>(parts, revalidate)).map(
    (answer) => answer.result,
  );
}

/**
 * The fallback for a read that decorates a page rather than being it.
 *
 * Covers, shelves and names come from IGDB; the reviews, people and lists
 * around them come from our own database. When IGDB was unreachable (Twitch
 * refusing the credentials, or IGDB itself down), one of those decorations
 * threw, the error climbed to the route's boundary, and the home page, every
 * profile and every list turned into "something went wrong" although almost
 * everything on them was there to show. These readers answer with less now,
 * and say so in the log.
 */
function unavailable<T>(what: string, fallback: T) {
  return (error: unknown): T => {
    console.error(
      `[igdb] ${what} unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return fallback;
  };
}

async function queryGamesRaw(body: string, revalidate?: number) {
  return queryIgdbRaw<IgdbGameResponse>("games", body, revalidate);
}

/** Several game queries in one request, each answered in order. */
async function queryGamesMulti(bodies: string[], revalidate?: number) {
  const answers = await queryIgdbMulti<IgdbGameResponse>(
    bodies.map((body) => ({ endpoint: "games", body })),
    revalidate,
  );
  return answers.map((rows) => rows.map(normalize));
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

function gameTypeId(gameType?: IgdbGameResponse["game_type"]) {
  return typeof gameType === "number" ? gameType : gameType?.id;
}

/** IGDB answers Steam under `external_game_source = 1`. */
function steamAppIdOf(game: {
  external_games?: { uid?: string; external_game_source?: number }[];
}) {
  return (
    (game.external_games ?? [])
      .map((entry) =>
        entry.external_game_source === 1 && entry.uid
          ? Number(entry.uid)
          : null,
      )
      .find(
        (id): id is number => id !== null && Number.isSafeInteger(id) && id > 0,
      ) ?? null
  );
}

function searchKind(
  gameType?: IgdbGameResponse["game_type"],
): GameSearchResult["kind"] {
  const id = gameTypeId(gameType);
  if (id === 1) return "dlc";
  if (id === 2 || id === 4) return "expansion";
  if (id === 10 || id === 11 || id === 14) return "edition";
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

  // The original wildcard search, restored verbatim: every word must match the
  // name, or every word must match an alternative name. Ordered by popularity so
  // the well-known titles surface, then re-ranked in JS. It is the ~1s query the
  // search box always used, the earlier 10s was the auth round-trip in the
  // route (now getClaims) and cold caches, not this query.
  const nameFilter = words.map((word) => `name ~ *"${word}"*`).join(" & ");
  const alternativeFilter = words
    .map((word) => `alternative_names.name ~ *"${word}"*`)
    .join(" & ");
  const games = await queryGamesRaw(
    `
    fields name,slug,first_release_date,cover.image_id,platforms.name,
      alternative_names.name,total_rating_count,game_type,
      external_games.uid,external_games.external_game_source;
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
      // A third of spawnd's catalogue has no IGDB id, so the badge on a
      // search result is wrong without this: it said "no demo" about
      // twenty-five games that have one.
      steamAppId: steamAppIdOf(game),
    }));
}

const catalogOptions = cache(async (): Promise<CatalogSearchOptions> => {
  type Named = { id: number; name: string };
  type Platform = Named & {
    abbreviation?: string;
    generation?: number;
    platform_family?: { name?: string };
    platform_type?: { name?: string };
  };
  // Every list the filters offer, in one request. Eight of them went as eight,
  // which on an empty cache (every deploy) made the catalogue's first visitor
  // wait out two seconds of the budget before a single option was drawn.
  const [
    genres,
    platforms,
    themes,
    modes,
    engines,
    rawTypes,
    perspectives,
    companies,
  ] = (await queryIgdbMulti<unknown>(
    [
      ["genres", "fields id,name; sort name asc; limit 500;"],
      [
        "platforms",
        "fields id,name,abbreviation,generation,platform_family.name,platform_type.name; sort name asc; limit 500;",
      ],
      ["themes", "fields id,name; sort name asc; limit 500;"],
      ["game_modes", "fields id,name; sort name asc; limit 500;"],
      ["game_engines", "fields id,name; sort name asc; limit 500;"],
      ["game_types", "fields id,type; sort type asc; limit 500;"],
      ["player_perspectives", "fields id,name; sort name asc; limit 500;"],
      [
        "companies",
        "fields id,name; where published != null; sort name asc; limit 500;",
      ],
    ].map(([endpoint, body]) => ({ endpoint, body })),
    24 * CACHE_HOURS,
    // Without them the filters offer nothing to pick, which beats the search
    // page not opening at all.
  ).catch(
    unavailable("catalogue filter options", [[], [], [], [], [], [], [], []]),
  )) as [
    Named[],
    Platform[],
    Named[],
    Named[],
    Named[],
    { id: number; type: string }[],
    Named[],
    Named[],
  ];
  const named = (items: Named[]): CatalogOption[] =>
    items.map(({ id, name }) => ({ id, name }));
  return {
    genres: named(genres),
    platforms: platforms.map((platform) => ({
      id: platform.id,
      name: platform.name,
      abbreviation: platform.abbreviation ?? null,
      generation: platform.generation ?? null,
      group:
        platform.platform_family?.name ?? platform.platform_type?.name ?? null,
    })),
    themes: named(themes),
    modes: named(modes),
    engines: named(engines),
    types: rawTypes.map(({ id, type }) => ({ id, name: type })),
    perspectives: named(perspectives),
    publishers: named(companies),
  };
});

export function getCatalogSearchOptions() {
  if (E2E_ENABLED)
    return import("@/lib/igdb-e2e").then(
      ({ e2eCatalogOptions }) => e2eCatalogOptions,
    );
  return catalogOptions();
}

export async function getCatalogPublisherOptions(ids: number[]) {
  const safeIds = [...new Set(ids)]
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, 24);
  if (!safeIds.length) return [];
  if (E2E_ENABLED) {
    const { e2eCatalogOptions } = await import("@/lib/igdb-e2e");
    return e2eCatalogOptions.publishers.filter((option) =>
      safeIds.includes(option.id),
    );
  }
  return queryIgdbRaw<CatalogOption>(
    "companies",
    `fields id,name; where id = (${safeIds.join(",")}); limit 24;`,
    24 * CACHE_HOURS,
  ).catch(unavailable("selected publishers", [] as CatalogOption[]));
}

export async function searchCatalogPublishers(query: string) {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 60);
  if (normalized.length < 2) return [];
  if (E2E_ENABLED) {
    const { e2eCatalogOptions } = await import("@/lib/igdb-e2e");
    return e2eCatalogOptions.publishers.filter((option) =>
      option.name.toLocaleLowerCase().includes(normalized.toLocaleLowerCase()),
    );
  }
  const results = await queryIgdbRaw<CatalogOption>(
    "companies",
    `fields id,name; where name ~ *"${escapeIgdb(normalized)}"*; limit 100;`,
    6 * CACHE_HOURS,
  );
  const needle = normalized.toLocaleLowerCase();
  return results
    .toSorted((a, b) => {
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      const aRank = aName === needle ? 0 : aName.startsWith(needle) ? 1 : 2;
      const bRank = bName === needle ? 0 : bName.startsWith(needle) ? 1 : 2;
      return aRank - bRank || a.name.localeCompare(b.name);
    })
    .slice(0, 30);
}

function safeEngineNames(names: string[]) {
  return [...new Set(names.map((name) => name.normalize("NFKC").trim()))]
    .filter((name) => name.length > 0 && name.length <= 80)
    .slice(0, 24);
}

export async function getCatalogEngineOptions(names: string[]) {
  const safeNames = safeEngineNames(names);
  if (!safeNames.length) return [];
  if (E2E_ENABLED) {
    const { e2eCatalogOptions } = await import("@/lib/igdb-e2e");
    const wanted = new Set(safeNames.map((name) => name.toLocaleLowerCase()));
    return e2eCatalogOptions.engines.filter((option) =>
      wanted.has(option.name.toLocaleLowerCase()),
    );
  }
  return queryIgdbRaw<CatalogOption>(
    "game_engines",
    `fields id,name; where (${safeNames
      .map((name) => `name = "${escapeIgdb(name)}"`)
      .join(" | ")}); limit 24;`,
    24 * CACHE_HOURS,
  );
}

export async function searchCatalogEngines(query: string) {
  const normalized = query
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  if (normalized.length < 2) return [];
  if (E2E_ENABLED) {
    const { e2eCatalogOptions } = await import("@/lib/igdb-e2e");
    return e2eCatalogOptions.engines.filter((option) =>
      option.name.toLocaleLowerCase().includes(normalized.toLocaleLowerCase()),
    );
  }
  const results = await queryIgdbRaw<CatalogOption>(
    "game_engines",
    `fields id,name; where name ~ *"${escapeIgdb(normalized)}"*; limit 100;`,
    6 * CACHE_HOURS,
  );
  const needle = normalized.toLocaleLowerCase();
  return results
    .toSorted((a, b) => {
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      const aRank = aName === needle ? 0 : aName.startsWith(needle) ? 1 : 2;
      const bRank = bName === needle ? 0 : bName.startsWith(needle) ? 1 : 2;
      return aRank - bRank || a.name.localeCompare(b.name);
    })
    .slice(0, 30);
}

export type CompanySearchResult = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string | null;
  foundedYear: number | null;
  publishedCount: number;
  developedCount: number;
};

export async function searchCompanies(options: {
  query: string;
  role: "any" | "publisher" | "developer";
  status: "any" | "active";
  sort: "relevance" | "name" | "oldest" | "newest" | "catalog";
  page: number;
  pageSize?: number;
}): Promise<{
  companies: CompanySearchResult[];
  total: number;
  totalPages: number;
}> {
  if (E2E_ENABLED) return { companies: [], total: 0, totalPages: 0 };
  const query = options.query.trim().replace(/\s+/g, " ").slice(0, 60);
  const roleClause =
    options.role === "publisher"
      ? "published != null"
      : options.role === "developer"
        ? "developed != null"
        : "(published != null | developed != null)";
  const rows = await queryIgdbRaw<IgdbCompanyResponse>(
    "companies",
    `
      fields id,name,slug,logo.image_id,status.name,start_date,published,developed;
      where ${roleClause}${query ? ` & name ~ *"${escapeIgdb(query)}"*` : ""};
      limit 100;
    `,
    6 * CACHE_HOURS,
  );
  const needle = query.toLocaleLowerCase();
  const normalized = rows
    .filter(
      (company) =>
        options.status !== "active" ||
        company.status?.name.toLocaleLowerCase() === "active",
    )
    .map((company): CompanySearchResult => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logo
        ? imageUrl(company.logo.image_id, "logo_med")
        : null,
      status: company.status?.name ?? null,
      foundedYear: company.start_date
        ? new Date(company.start_date * 1000).getUTCFullYear()
        : null,
      publishedCount: company.published?.length ?? 0,
      developedCount: company.developed?.length ?? 0,
    }));
  normalized.sort((a, b) => {
    if (options.sort === "name") return a.name.localeCompare(b.name);
    if (options.sort === "oldest")
      return (a.foundedYear ?? 9999) - (b.foundedYear ?? 9999);
    if (options.sort === "newest")
      return (b.foundedYear ?? 0) - (a.foundedYear ?? 0);
    if (options.sort === "catalog")
      return (
        b.publishedCount +
        b.developedCount -
        (a.publishedCount + a.developedCount)
      );
    const rank = (name: string) => {
      const value = name.toLocaleLowerCase();
      return value === needle ? 0 : value.startsWith(needle) ? 1 : 2;
    };
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  });
  const pageSize = options.pageSize ?? 24;
  const total = normalized.length;
  const totalPages = total ? Math.ceil(total / pageSize) : 0;
  const page = Math.min(Math.max(1, options.page), Math.max(1, totalPages));
  return {
    companies: normalized.slice((page - 1) * pageSize, page * pageSize),
    total,
    totalPages,
  };
}

export async function searchCatalogGames(filters: CatalogSearchFilters) {
  if (E2E_ENABLED) {
    const { searchE2eCatalog } = await import("@/lib/igdb-e2e");
    return searchE2eCatalog(filters);
  }
  const limit = 24;
  const offset = (Math.max(1, filters.page) - 1) * limit;
  const clauses = ["cover != null"];
  const ids = (values: number[]) =>
    [...new Set(values)]
      .filter((value) => Number.isSafeInteger(value) && value > 0)
      .slice(0, 24);
  const addIds = (field: string, values: number[]) => {
    const safe = ids(values);
    if (safe.length) clauses.push(`${field} = (${safe.join(",")})`);
  };
  addIds("genres", filters.genres);
  addIds("platforms", filters.platforms);
  addIds("themes", filters.themes);
  addIds("game_modes", filters.modes);
  const engineOptions = await getCatalogEngineOptions(filters.engines);
  if (filters.engines.length && !engineOptions.length) clauses.push("id = -1");
  addIds(
    "game_engines",
    engineOptions.map((engine) => engine.id),
  );
  addIds("player_perspectives", filters.perspectives);
  addIds("involved_companies.company", filters.publishers);
  // Only meaningful next to a company: on its own the role clause would match
  // every game that has any publisher at all.
  if (filters.publishers.length && filters.publisherRole !== "any")
    clauses.push(`involved_companies.${filters.publisherRole} = true`);
  const types = ids(filters.types);
  clauses.push(
    types.length ? `game_type = (${types.join(",")})` : "game_type = (0,8,9)",
  );
  const now = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) * 24 * 60 * 60;
  if (filters.releaseStatus === "released")
    clauses.push(`first_release_date <= ${now}`);
  if (filters.releaseStatus === "upcoming")
    clauses.push(`first_release_date > ${now}`);
  if (filters.ratedOnly) clauses.push("total_rating_count > 0");
  if (filters.anticipatedOnly) clauses.push("hypes > 0");
  if (filters.yearFrom) {
    clauses.push(
      `first_release_date >= ${Math.floor(Date.UTC(filters.yearFrom, 0, 1) / 1000)}`,
    );
  }
  if (filters.yearTo) {
    clauses.push(
      `first_release_date < ${Math.floor(Date.UTC(filters.yearTo + 1, 0, 1) / 1000)}`,
    );
  }
  if (filters.ratingMin !== null)
    clauses.push(
      `total_rating >= ${Math.max(0, Math.min(100, filters.ratingMin))}`,
    );
  if (filters.ratingCountMin !== null)
    clauses.push(
      `total_rating_count >= ${Math.max(0, filters.ratingCountMin)}`,
    );
  // Accuracy guards, mirroring how IGDB curates its own listings: a
  // highest-rated sort without a vote floor surfaces one-vote 100s, and an
  // anticipated sort without hype surfaces arbitrary unreleased rows.
  if (filters.sort === "rating" && filters.ratingCountMin === null)
    clauses.push("total_rating_count >= 10");
  if (filters.sort === "hype" && !filters.anticipatedOnly)
    clauses.push("hypes > 0");
  if (filters.sort === "popular") clauses.push("total_rating_count > 0");
  const words = filters.query
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .split(" ")
    .map(escapeIgdb)
    .filter((word) => word.length >= 2)
    .slice(0, 6);
  if (words.length) {
    const names = words.map((word) => `name ~ *"${word}"*`).join(" & ");
    const alternatives = words
      .map((word) => `alternative_names.name ~ *"${word}"*`)
      .join(" & ");
    clauses.push(`(${names} | ${alternatives})`);
  }
  const sorts: Record<CatalogSearchFilters["sort"], string> = {
    popular: "total_rating_count desc",
    rating: "total_rating desc",
    newest: "first_release_date desc",
    oldest: "first_release_date asc",
    hype: "hypes desc",
    name: "name asc",
  };
  const where = clauses.join(" & ");
  // The page and its total in one request. Every search, sort and page turn
  // in the catalogue asked twice, which made the most used thing on the site
  // the biggest spender of the four requests a second the deployment has.
  const [page, counted] = await queryIgdbMultiParts<IgdbGameResponse>(
    [
      {
        endpoint: "games",
        body: `
      fields name,slug,summary,hypes,total_rating,total_rating_count,first_release_date,
        cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.name,
        involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
        themes.name,game_modes.name,game_engines.name,game_type.type;
      where ${where};
      sort ${sorts[filters.sort]};
      limit ${limit + 1};
      offset ${offset};
    `,
      },
      { endpoint: "games/count", body: `where ${where};` },
    ],
    15 * CACHE_MINUTES,
  );
  const rows = page.result;
  const total = Math.max(0, counted.count ?? 0);
  const totalPages = Math.min(100, Math.max(1, Math.ceil(total / limit)));
  const hasMore = rows.length > limit;
  const games: CatalogGame[] = rows.slice(0, limit).map((game) => ({
    ...normalize(game),
    genres: game.genres?.map(({ name }) => name) ?? [],
    platforms: game.platforms?.map(({ name }) => name) ?? [],
    themes: game.themes?.map(({ name }) => name) ?? [],
    modes: game.game_modes?.map(({ name }) => name) ?? [],
    engines: game.game_engines?.map(({ name }) => name) ?? [],
    typeName: typeof game.game_type === "object" ? game.game_type.type : null,
  }));
  return { games, hasMore, page: filters.page, total, totalPages };
}

export async function getPopularGames(): Promise<Game[]> {
  if (E2E_ENABLED) {
    const { e2ePopularGames } = await import("@/lib/igdb-e2e");
    return e2ePopularGames();
  }
  return queryGames(
    `
    fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source;
    where cover != null & total_rating_count > 500 & game_type = (0,8,9);
    sort total_rating_count desc;
    limit 16;
  `,
    6 * CACHE_HOURS,
  ).catch(unavailable("popular games", [] as Game[]));
}

// Pages hydrate heavily overlapping id sets (covers, lists, activity), so a
// per-id memo keeps repeat lookups off IGDB entirely. Misses are negative
// cached briefly so unknown ids don't refetch on every render.
const GAME_MEMO_TTL = 30 * 60 * 1000;
const GAME_MEMO_MAX = 4000;
const gameMemo = new Map<number, { game: Game | null; expires: number }>();

export async function getGamesByIds(ids: number[]): Promise<Game[]> {
  if (E2E_ENABLED) {
    const { e2eGamesByIds } = await import("@/lib/igdb-e2e");
    return e2eGamesByIds(ids);
  }
  const safeIds = [...new Set(ids)]
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
  if (!safeIds.length) return [];
  const now = Date.now();
  const found: Game[] = [];
  const missing: number[] = [];
  for (const id of safeIds) {
    const memo = gameMemo.get(id);
    if (memo && memo.expires > now) {
      if (memo.game) found.push(memo.game);
    } else missing.push(id);
  }
  if (!missing.length) return found;
  const batches = Array.from(
    { length: Math.ceil(missing.length / 100) },
    (_, index) => missing.slice(index * 100, index * 100 + 100),
  );
  // A hundred ids at a time, ten of those batches per request: a library of a
  // thousand games is one request rather than ten, one after another.
  const fetched = (
    await queryGamesMulti(
      batches.map(
        (batch) => `
          fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source;
          where id = (${batch.join(",")});
          limit ${batch.length};
        `,
      ),
      12 * CACHE_HOURS,
    ).catch(unavailable("games by id", null))
  )?.flat();
  // A failed read answers with what was already known and remembers
  // nothing: marking these as missing would hide them for the memo's
  // whole lifetime after IGDB came back.
  if (!fetched) return found;
  const fetchedIds = new Set(fetched.map((game) => game.id));
  const expires = now + GAME_MEMO_TTL;
  for (const game of fetched) gameMemo.set(game.id, { game, expires });
  for (const id of missing) {
    if (!fetchedIds.has(id)) gameMemo.set(id, { game: null, expires });
  }
  while (gameMemo.size > GAME_MEMO_MAX) {
    const oldest = gameMemo.keys().next().value;
    if (oldest === undefined) break;
    gameMemo.delete(oldest);
  }
  return [...found, ...fetched];
}

// Markdown game cards reference games by slug; same memo strategy as ids.
const slugMemo = new Map<string, { game: Game | null; expires: number }>();
// Importers can validate hundreds of exact IGDB slugs at once. A 100-item body
// remains small while cutting large-library validation from dozens of upstream
// round trips to a handful.
const SLUG_BATCH = 100;

export async function getGamesBySlugs(slugs: string[]): Promise<Game[]> {
  const safeSlugs = [...new Set(slugs.map((slug) => slug.trim().toLowerCase()))]
    .filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug))
    .sort();
  if (!safeSlugs.length) return [];
  // The one catalogue reader that still went upstream under the harness. Every
  // other one answers from the fixtures, so a slug the fixtures know came back
  // as nothing here and looked like a missing game rather than a missing stub.
  if (E2E_ENABLED) {
    const { e2eGamesBySlugs } = await import("@/lib/igdb-e2e");
    return e2eGamesBySlugs(safeSlugs);
  }
  const now = Date.now();
  const found: Game[] = [];
  const missing: string[] = [];
  for (const slug of safeSlugs) {
    const memo = slugMemo.get(slug);
    if (memo && memo.expires > now) {
      if (memo.game) found.push(memo.game);
    } else missing.push(slug);
  }
  if (!missing.length) return found;
  // Split into batches instead of one oversized query: a long drawer can ask
  // for dozens of slugs at once, and a single truncated request used to drop
  // whatever fell past the limit.
  const batches: string[][] = [];
  for (let index = 0; index < missing.length; index += SLUG_BATCH) {
    batches.push(missing.slice(index, index + SLUG_BATCH));
  }
  // Ten batches to a request, rather than one request per batch in a row.
  const fetched = (
    await queryGamesMulti(
      batches.map(
        (batch) => `
    fields name,slug,summary,total_rating,total_rating_count,first_release_date,
      cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.name,
      involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source;
    where slug = (${batch.map((slug) => `"${slug}"`).join(",")});
    limit ${batch.length};
  `,
      ),
      12 * CACHE_HOURS,
    ).catch(unavailable("games by slug", null))
  )?.flat();
  // A failed read answers with what was already known and remembers
  // nothing: marking these as missing would hide them for the memo's
  // whole lifetime after IGDB came back.
  if (!fetched) return found;
  const fetchedSlugs = new Set(fetched.map((game) => game.slug));
  const expires = now + GAME_MEMO_TTL;
  for (const game of fetched) slugMemo.set(game.slug, { game, expires });
  for (const slug of missing) {
    if (!fetchedSlugs.has(slug)) slugMemo.set(slug, { game: null, expires });
  }
  while (slugMemo.size > GAME_MEMO_MAX) {
    const oldest = slugMemo.keys().next().value;
    if (oldest === undefined) break;
    slugMemo.delete(oldest);
  }
  return [...found, ...fetched];
}

export type DiscoveryGames = {
  anticipated: Game[];
  upcoming: Game[];
  hiddenGems: Game[];
};

export type GenreCollection = {
  id: number;
  name: Record<UiLang, string>;
  games: Game[];
};

export type GameDetail = Game & {
  searchFilters: {
    genres: { id: number; name: string }[];
    platforms: { id: number; name: string }[];
    themes: { id: number; name: string }[];
    modes: { id: number; name: string }[];
    engines: { id: number; name: string }[];
    // slug is what links a game to its company page; it is optional because
    // IGDB occasionally has a company row without one.
    developers: { id: number; name: string; slug?: string }[];
    publishers: { id: number; name: string; slug?: string }[];
  };
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
  engines: string[];
  websites: string[];
  languages: {
    name: string;
    nativeName: string | null;
    /**
     * IGDB's own, like `pt-BR` or `ja-JP`. The region half is the flag the
     * page draws: a language is not a place, so the country it is shown by
     * has to come from the catalogue rather than be guessed from the name.
     */
    locale: string | null;
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
  if (E2E_ENABLED) {
    const { e2eGameBySlug } = await import("@/lib/igdb-e2e");
    return e2eGameBySlug(slug);
  }
  const games = await queryGamesRaw(
    `
    fields name,slug,summary,hypes,total_rating,total_rating_count,first_release_date,
      cover.image_id,artworks.image_id,screenshots.image_id,genres.id,genres.name,
      platforms.id,platforms.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.id,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      videos.video_id,videos.name,themes.id,themes.name,game_modes.id,game_modes.name,game_engines.id,game_engines.name,websites.url,
      age_ratings.organization.name,age_ratings.rating_category.rating,
      language_supports.language.name,language_supports.language.native_name,language_supports.language.locale,language_supports.language_support_type.name,
      similar_games.name,similar_games.slug,similar_games.first_release_date,similar_games.total_rating,similar_games.total_rating_count,similar_games.cover.image_id,similar_games.genres.name,similar_games.involved_companies.developer,similar_games.involved_companies.publisher,similar_games.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      dlcs.name,dlcs.slug,dlcs.first_release_date,dlcs.total_rating,dlcs.total_rating_count,dlcs.cover.image_id,dlcs.genres.name,dlcs.involved_companies.developer,dlcs.involved_companies.publisher,dlcs.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      expansions.name,expansions.slug,expansions.first_release_date,expansions.total_rating,expansions.total_rating_count,expansions.cover.image_id,expansions.genres.name,expansions.involved_companies.developer,expansions.involved_companies.publisher,expansions.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      standalone_expansions.name,standalone_expansions.slug,standalone_expansions.first_release_date,standalone_expansions.total_rating,standalone_expansions.total_rating_count,standalone_expansions.cover.image_id,standalone_expansions.genres.name,standalone_expansions.involved_companies.developer,standalone_expansions.involved_companies.publisher,standalone_expansions.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      ports.name,ports.slug,ports.first_release_date,ports.total_rating,ports.total_rating_count,ports.cover.image_id,ports.genres.name,ports.involved_companies.developer,ports.involved_companies.publisher,ports.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      remakes.name,remakes.slug,remakes.first_release_date,remakes.total_rating,remakes.total_rating_count,remakes.cover.image_id,remakes.genres.name,remakes.involved_companies.developer,remakes.involved_companies.publisher,remakes.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
      remasters.name,remasters.slug,remasters.first_release_date,remasters.total_rating,remasters.total_rating_count,remasters.cover.image_id,remasters.genres.name,remasters.involved_companies.developer,remasters.involved_companies.publisher,remasters.involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
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
  // The three things left to know about this game travel together: other
  // editions of it, the events it appeared at, and how long it takes to
  // finish. Three requests cost three of the four the deployment has each
  // second, and the page waited out the gaps between them. They share the
  // shortest of the three lifetimes, which is the events one.
  const [siblings, events, timeToBeatRows] = (await queryIgdbMulti<
    IgdbGameResponse | IgdbEventResponse | IgdbTimeToBeatResponse
  >(
    [
      {
        endpoint: "games",
        body: `
        fields name,slug,first_release_date,total_rating,total_rating_count,cover.image_id,genres.name,
          involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source,
          game_localizations.cover.image_id;
        where version_parent = ${rootId};
        limit 500;
      `,
      },
      {
        endpoint: "events",
        body: `
        fields name,slug,description,start_time,end_time,live_stream_url,event_logo.image_id;
        where games = [${raw.id}];
        sort start_time desc;
        limit 12;
      `,
      },
      {
        endpoint: "game_time_to_beats",
        body: `
        fields hastily,normally,completely,count;
        where game_id = ${raw.id};
        limit 1;
      `,
      },
    ],
    6 * CACHE_HOURS,
  ).catch(() => [[], [], []])) as [
    IgdbGameResponse[],
    IgdbEventResponse[],
    IgdbTimeToBeatResponse[],
  ];
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
      locale: entry.language.locale ?? null,
      support: [],
    };
    if (!current.support.includes(entry.language_support_type.name)) {
      current.support.push(entry.language_support_type.name);
    }
    languages.set(entry.language.name, current);
  }

  return {
    ...normalize(raw),
    searchFilters: {
      genres: raw.genres ?? [],
      platforms: raw.platforms ?? [],
      themes: raw.themes ?? [],
      modes: raw.game_modes ?? [],
      engines: raw.game_engines ?? [],
      developers:
        raw.involved_companies
          ?.filter((item) => item.developer && item.company)
          .map((item) => item.company!) ?? [],
      publishers:
        raw.involved_companies
          ?.filter((item) => item.publisher && item.company)
          .map((item) => item.company!) ?? [],
    },
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
    engines: raw.game_engines?.map((engine) => engine.name) ?? [],
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
  if (E2E_ENABLED) {
    const { e2eDiscoveryGames } = await import("@/lib/igdb-e2e");
    return e2eDiscoveryGames();
  }
  // A day boundary keeps the IGDB request body stable so the data cache can hit.
  const now = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) * 24 * 60 * 60;
  const inFourMonths = now + 60 * 60 * 24 * 120;
  const twoYearsAgo = now - 60 * 60 * 24 * 365 * 2;
  const fields =
    "name,slug,summary,hypes,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source";

  // One request for the three shelves. Three cost three slots of the budget
  // and the waits between them, on the page every visitor sees first.
  const [anticipated, upcoming, hiddenGems] = await queryGamesMulti(
    [
      `
      fields ${fields};
      where cover != null & first_release_date > ${now} & hypes > 5 & game_type = (0,8,9);
      sort hypes desc;
      limit 12;
    `,
      `
      fields ${fields};
      where cover != null & first_release_date > ${now} & first_release_date < ${inFourMonths} & game_type = (0,8,9);
      sort first_release_date asc;
      limit 12;
    `,
      `
      fields ${fields};
      where cover != null & first_release_date < ${twoYearsAgo} & total_rating >= 80 & total_rating_count >= 50 & total_rating_count < 350 & game_type = 0 & franchises = null & collections = null;
      sort total_rating desc;
      limit 12;
    `,
    ],
    6 * CACHE_HOURS,
  ).catch(unavailable("discovery shelves", [[], [], []] as Game[][]));

  return { anticipated, upcoming, hiddenGems };
}

export async function getGenreCollections(): Promise<GenreCollection[]> {
  if (E2E_ENABLED) {
    const { e2eGenreCollections } = await import("@/lib/igdb-e2e");
    return e2eGenreCollections();
  }
  const genres = [
    { id: 12, name: { "pt-BR": "RPG", en: "RPG", es: "RPG" } },
    { id: 5, name: { "pt-BR": "Tiro", en: "Shooter", es: "Disparos" } },
    { id: 31, name: { "pt-BR": "Aventura", en: "Adventure", es: "Aventura" } },
    {
      id: 15,
      name: { "pt-BR": "Estratégia", en: "Strategy", es: "Estrategia" },
    },
    {
      id: 32,
      name: { "pt-BR": "Independentes", en: "Indie", es: "Indies" },
    },
  ] as const;
  // Five shelves, one request.
  const games = await queryGamesMulti(
    genres.map(
      (genre) => `
        fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source;
        where cover != null & genres = (${genre.id}) & total_rating_count >= 40 & game_type = 0;
        sort total_rating_count desc;
        limit 40;
      `,
    ),
    12 * CACHE_HOURS,
  ).catch(unavailable("genre shelves", [] as Game[][]));
  return genres.map((genre, index) => ({
    ...genre,
    games: games[index] ?? [],
  }));
}

/**
 * Genre-driven recommendations from what a viewer has been looking at. Reads the
 * genre ids of their recent games, takes the most frequent ones, and returns the
 * best-rated games in those genres, minus anything already seen or owned.
 */
export async function getForYouGames(
  recentGameIds: number[],
  excludeIds: number[] = [],
): Promise<Game[]> {
  if (E2E_ENABLED) return [];
  const seed = [...new Set(recentGameIds)]
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 30);
  if (seed.length < 2) return [];

  // `fields genres` (no .name) returns the genre ids, so they can be counted
  // straight away.
  const seeds = await queryGamesRaw(
    `fields genres; where id = (${seed.join(",")}) & genres != null; limit ${seed.length};`,
    30 * CACHE_MINUTES,
  );
  const counts = new Map<number, number>();
  for (const row of seeds) {
    for (const genreId of (row.genres as unknown as number[] | undefined) ?? [])
      counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
  }
  const topGenres = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  if (!topGenres.length) return [];

  const genreClause = topGenres.map((id) => `genres = (${id})`).join(" | ");
  const games = await queryGames(
    `
    fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source;
    where cover != null & (${genreClause}) & total_rating_count >= 30 & game_type = 0;
    sort total_rating_count desc;
    limit 40;
  `,
    30 * CACHE_MINUTES,
  );
  const exclude = new Set([...excludeIds, ...seed]);
  return games.filter((game) => !exclude.has(game.id)).slice(0, 18);
}

type IgdbCompanyResponse = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  country?: number;
  start_date?: number;
  logo?: IgdbImage;
  websites?: { url: string }[];
  parent?: { id: number; name: string; slug: string };
  published?: number[];
  developed?: number[];
  status?: { id: number; name: string };
  url?: string;
};

export type CompanyProfile = {
  id: number;
  name: string;
  slug: string;
  description: string;
  countryCode: number | null;
  foundedTimestamp: number | null;
  logoUrl: string | null;
  websites: string[];
  parent: { name: string; slug: string } | null;
  /** "active", "defunct", "acquired"… straight from IGDB's company_statuses. */
  status: string | null;
  igdbUrl: string | null;
  publishedCount: number;
  developedCount: number;
  published: Game[];
  developed: Game[];
};

export type CompanyTrailer = {
  id: number;
  name: string;
  slug: string;
  releaseTimestamp: number | null;
  video: { id: string; name: string };
};

export type CompanyEvent = {
  id: number;
  name: string;
  slug: string;
  startTimestamp: number | null;
  endTimestamp: number | null;
  liveStreamUrl: string | null;
  logoUrl: string | null;
};

/** Releases per year across the whole catalogue, oldest first. */
export type CompanyTimeline = { year: number; count: number }[];

/**
 * What a company's whole catalogue is made of, from the same sweep that
 * counts the years.
 *
 * The genres and platforms are over every dated release the sweep reached,
 * not over the dozen games the shelves show, which is the difference between
 * "what this company makes" and "what happens to be popular this week".
 */
export type CompanySlice = { id: number; name: string; count: number };

export type CompanyCatalogue = {
  timeline: CompanyTimeline;
  /**
   * Most common first, with how many releases carry each. The id is IGDB's
   * own, which is what the catalogue search filters by, so each slice of the
   * chart can be opened as a search of the company's games.
   */
  genres: CompanySlice[];
  platforms: CompanySlice[];
  /** How many dated releases the counts above are drawn from. */
  counted: number;
};

const COMPANY_GAME_FIELDS =
  "fields name,slug,summary,total_rating,total_rating_count,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,involved_companies.publisher,involved_companies.developer,involved_companies.company.name,involved_companies.company.slug,external_games.uid,external_games.external_game_source;";

// A company's `published`/`developed` arrays hold every game id, which is the
// cheapest exact total available, counting through the games endpoint would
// need a second round trip per role.
export const getCompanyBySlug = cache(async function getCompanyBySlug(
  slug: string,
): Promise<CompanyProfile | null> {
  if (!/^[a-z0-9-]{1,255}$/.test(slug)) return null;
  // The e2e fixtures carry games, not companies; without credentials the live
  // query would throw instead of rendering a clean 404.
  if (E2E_ENABLED) return null;
  const companies = await queryIgdbRaw<IgdbCompanyResponse>(
    "companies",
    `
    fields id,name,slug,description,country,start_date,logo.image_id,websites.url,
      parent.id,parent.name,parent.slug,published,developed,status.name,url;
    where slug = "${escapeIgdb(slug)}";
    limit 1;
  `,
    12 * CACHE_HOURS,
  );
  const company = companies[0];
  if (!company) return null;

  const roleQuery = (role: "publisher" | "developer") => `
    ${COMPANY_GAME_FIELDS}
    where involved_companies.company = ${company.id}
      & involved_companies.${role} = true
      & cover != null
      & game_type = (0,8,9);
    sort total_rating_count desc;
    limit 10;
  `;
  // Both shelves in one request: two cost two slots of the budget and the
  // wait between them, before the page has a title.
  const wanted = [
    company.published?.length ? roleQuery("publisher") : null,
    company.developed?.length ? roleQuery("developer") : null,
  ];
  const shelves = await queryGamesMulti(
    wanted.filter((query): query is string => query !== null),
    12 * CACHE_HOURS,
  );
  const published = wanted[0] ? (shelves.shift() ?? []) : [];
  const developed = wanted[1] ? (shelves.shift() ?? []) : [];

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    description: company.description?.trim() ?? "",
    countryCode: company.country ?? null,
    foundedTimestamp: company.start_date ?? null,
    // t_original keeps the upload as it was, transparency included; the logo_med
    // preset downscales to a width that looked washed out at hero size.
    logoUrl: company.logo ? imageUrl(company.logo.image_id, "original") : null,
    websites: [
      ...new Set(
        (company.websites ?? [])
          .map((site) => site.url)
          .filter((url) => /^https?:\/\//.test(url)),
      ),
    ].slice(0, 6),
    parent: company.parent
      ? { name: company.parent.name, slug: company.parent.slug }
      : null,
    status: company.status?.name ?? null,
    igdbUrl: company.url ?? null,
    publishedCount: company.published?.length ?? 0,
    developedCount: company.developed?.length ?? 0,
    published,
    developed,
  };
});

/**
 * Sweeps every dated release for one company, one field per row. A big
 * company needs several pages. IGDB caps a request at 500, so this is kept
 * out of getCompanyBySlug and streamed into the page behind Suspense instead of
 * holding the shell hostage.
 */
export const getCompanyCatalogue = cache(async function getCompanyCatalogue(
  companyId: number,
): Promise<CompanyCatalogue> {
  const empty: CompanyCatalogue = {
    timeline: [],
    genres: [],
    platforms: [],
    counted: 0,
  };
  if (!Number.isSafeInteger(companyId) || companyId <= 0) return empty;
  const perYear = new Map<number, number>();
  // Keyed by IGDB's id rather than by the name, so the count and the filter
  // that reproduces it are the same thing.
  const perGenre = new Map<number, CompanySlice>();
  const perPlatform = new Map<number, CompanySlice>();
  const PAGE = 500;
  const PAGES = 6;
  // The genres and platforms ride along with the dates: the sweep already
  // pages through every release, and asking for three fields instead of one
  // costs bytes rather than requests, which are the thing in short supply.
  const dates = (page: number) => `
      fields first_release_date,genres.id,genres.name,platforms.id,platforms.name;
      where involved_companies.company = ${companyId} & first_release_date != null;
      sort first_release_date asc;
      limit ${PAGE};
      offset ${page * PAGE};
    `;
  type Dated = {
    first_release_date: number;
    genres?: { id: number; name: string }[];
    platforms?: { id: number; name: string }[];
  };
  // The first page on its own: most companies have one, and asking for six
  // would fetch three thousand rows to count a dozen.
  const first = await queryIgdbRaw<Dated>(
    "games",
    dates(0),
    24 * CACHE_HOURS,
  ).catch(() => [] as Dated[]);
  const rest =
    first.length < PAGE
      ? []
      : (
          await queryIgdbMulti<Dated>(
            Array.from({ length: PAGES - 1 }, (_, index) => ({
              endpoint: "games",
              body: dates(index + 1),
            })),
            24 * CACHE_HOURS,
          ).catch(() => [] as Dated[][])
        ).flat();
  const rows = [...first, ...rest];
  const count = (
    into: Map<number, CompanySlice>,
    items: { id: number; name: string }[] | undefined,
  ) => {
    for (const item of items ?? []) {
      if (!item?.id || !item.name) continue;
      const held = into.get(item.id);
      if (held) held.count += 1;
      else into.set(item.id, { id: item.id, name: item.name, count: 1 });
    }
  };
  for (const row of rows) {
    const year = new Date(row.first_release_date * 1000).getUTCFullYear();
    perYear.set(year, (perYear.get(year) ?? 0) + 1);
    // Counted once per release, not once per edition: a game on five
    // platforms is five platform rows and one genre row for each genre it
    // carries, which is what "how many releases were shooters" means.
    count(perGenre, row.genres);
    count(perPlatform, row.platforms);
  }
  const ranked = (slices: Map<number, CompanySlice>) =>
    [...slices.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  return {
    timeline: [...perYear.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    genres: ranked(perGenre),
    platforms: ranked(perPlatform),
    counted: rows.length,
  };
});

/**
 * Everything the sections under a company's header need, in one request.
 *
 * Three sections, each streamed on its own, asked for their own thing: with
 * four requests a second for the whole deployment they queued behind each
 * other and behind the chart. They are read together now and arrive together.
 */
const companySections = cache(async function companySections(
  companyId: number,
) {
  const today = Math.floor(Date.now() / 86_400_000) * 86_400;
  const [upcoming, trailers, popular] = await queryIgdbMulti<IgdbGameResponse>(
    [
      {
        endpoint: "games",
        body: `
    ${COMPANY_GAME_FIELDS}
    where involved_companies.company = ${companyId}
      & first_release_date > ${today}
      & cover != null
      & game_type = (0,8,9);
    sort first_release_date asc;
    limit 8;
  `,
      },
      {
        endpoint: "games",
        body: `
    fields name,slug,first_release_date,videos.video_id,videos.name;
    where involved_companies.company = ${companyId}
      & first_release_date <= ${today}
      & videos != null
      & cover != null
      & game_type = (0,8,9);
    sort first_release_date desc;
    limit 4;
  `,
      },
      {
        endpoint: "games",
        body: `
    fields id;
    where involved_companies.company = ${companyId} & cover != null;
    sort total_rating_count desc;
    limit 50;
  `,
      },
    ],
    6 * CACHE_HOURS,
  ).catch(() => [[], [], []] as IgdbGameResponse[][]);
  return { upcoming, trailers, popular };
});

/** Announced but unreleased, nearest first, the company's own release radar. */
export const getCompanyUpcoming = cache(async function getCompanyUpcoming(
  companyId: number,
): Promise<Game[]> {
  if (!Number.isSafeInteger(companyId) || companyId <= 0) return [];
  const { upcoming } = await companySections(companyId);
  return upcoming.map(normalize);
});

export const getCompanyTrailers = cache(async function getCompanyTrailers(
  companyId: number,
): Promise<CompanyTrailer[]> {
  if (!Number.isSafeInteger(companyId) || companyId <= 0) return [];
  const { trailers } = await companySections(companyId);
  return trailers.flatMap((game) => {
    const video = game.videos?.[0];
    if (!video?.video_id) return [];
    return [
      {
        id: game.id,
        name: game.name,
        slug: game.slug,
        releaseTimestamp: game.first_release_date ?? null,
        video: { id: video.video_id, name: video.name ?? game.name },
      },
    ];
  });
});

export const getCompanyEvents = cache(async function getCompanyEvents(
  companyId: number,
): Promise<CompanyEvent[]> {
  if (!Number.isSafeInteger(companyId) || companyId <= 0) return [];
  const { popular } = await companySections(companyId);
  if (!popular.length) return [];
  const events = await queryIgdbRaw<IgdbEventResponse>(
    "events",
    `
    fields name,slug,start_time,end_time,live_stream_url,event_logo.image_id;
    where games = (${popular.map((game) => game.id).join(",")});
    sort start_time desc;
    limit 6;
  `,
    12 * CACHE_HOURS,
  ).catch(() => []);
  return events.map((event) => ({
    id: event.id,
    name: event.name,
    slug: event.slug,
    startTimestamp: event.start_time ?? null,
    endTimestamp: event.end_time ?? null,
    liveStreamUrl: event.live_stream_url ?? null,
    logoUrl: event.event_logo
      ? imageUrl(event.event_logo.image_id, "thumb")
      : null,
  }));
});
