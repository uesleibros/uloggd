import parse, { type HTMLElement } from "h1-parser";
import { normalizeBackloggdAvatarUrl } from "@/lib/backloggd/avatar";

const BACKLOGGD_HOST = "backloggd.com";
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const GAME_PATH_PATTERN = /^\/games\/([a-z0-9-]{1,120})\/?$/;
const MAX_PAGE_NUMBER = 100;
const COLLECTION_KINDS = [
  "all",
  "played",
  "playing",
  "backlog",
  "wishlist",
] as const;
const ANUBIS_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANUBIS_RANDOM_DATA_PATTERN = /^[0-9a-f]{128}$/i;
const ANUBIS_BASE_PREFIX_PATTERN = /^(?:\/[A-Za-z0-9._~-]+)*$/;
const MAX_ANUBIS_DIFFICULTY = 5;

export type BackloggdSourceGame = {
  slug: string;
  sourceName: string | null;
  personalRating: number | null;
  played: boolean;
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
};

export type BackloggdCollectionKind = (typeof COLLECTION_KINDS)[number];

export type ParsedBackloggdPage = {
  games: BackloggdSourceGame[];
  pageUrls: string[];
  challenge: boolean;
  privateProfile: boolean;
  profileDisplayName: string | null;
  profileAvatarUrl: string | null;
};

export type ParsedAnubisChallenge = {
  id: string;
  randomData: string;
  difficulty: number;
  method: "fast";
  basePrefix: string;
};

function canonicalHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function cleanText(value: string | null | undefined) {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  return text.length > 0 && text.length <= 180 ? text : null;
}

export function normalizeBackloggdUsername(input: string): string | null {
  const raw = input.trim();
  if (USERNAME_PATTERN.test(raw)) return raw;
  if (raw.startsWith("@") && USERNAME_PATTERN.test(raw.slice(1)))
    return raw.slice(1);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    canonicalHost(url.hostname) !== BACKLOGGD_HOST ||
    url.port ||
    url.username ||
    url.password
  )
    return null;
  const match = url.pathname.match(/^\/u\/([^/]+)\/?(?:games\/?)?$/i);
  if (!match) return null;
  let username: string;
  try {
    username = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function backloggdCollectionUrl(
  username: string,
  page = 1,
  kind: BackloggdCollectionKind = "all",
) {
  if (!USERNAME_PATTERN.test(username)) throw new Error("Invalid username");
  if (!COLLECTION_KINDS.includes(kind)) throw new Error("Invalid collection");
  const suffix = kind === "all" ? "games/" : `games/added/type:${kind}/`;
  const url = new URL(
    `/u/${encodeURIComponent(username)}/${suffix}`,
    `https://${BACKLOGGD_HOST}`,
  );
  if (page > 1) url.searchParams.set("page", String(page));
  return url;
}

function collectionKind(candidate: URL, username: string) {
  const base = `/u/${encodeURIComponent(username)}/`.toLowerCase();
  const path = candidate.pathname.toLowerCase().replace(/\/$/, "");
  if (path === `${base}games`) return "all" as const;
  for (const kind of COLLECTION_KINDS) {
    if (kind !== "all" && path === `${base}games/added/type:${kind}`)
      return kind;
  }
  return null;
}

export function isAllowedBackloggdCollectionUrl(
  candidate: URL,
  username: string,
) {
  if (
    candidate.protocol !== "https:" ||
    canonicalHost(candidate.hostname) !== BACKLOGGD_HOST ||
    candidate.port ||
    candidate.username ||
    candidate.password ||
    candidate.hash
  )
    return false;
  if (!collectionKind(candidate, username)) return false;
  if ([...candidate.searchParams.keys()].some((key) => key !== "page"))
    return false;
  const page = candidate.searchParams.get("page");
  return (
    page === null ||
    (/^[1-9]\d{0,2}$/.test(page) && Number(page) <= MAX_PAGE_NUMBER)
  );
}

function sourceName(anchor: HTMLElement) {
  const imageAlt =
    anchor.querySelector("img")?.getAttribute("alt") ??
    anchor.closest(".game-cover")?.querySelector("img")?.getAttribute("alt");
  return (
    cleanText(anchor.getAttribute("title")) ??
    cleanText(imageAlt) ??
    cleanText(anchor.textContent)
  );
}

function personalRating(anchor: HTMLElement) {
  const raw = anchor.closest(".game-cover")?.getAttribute("data-rating");
  if (!raw || !/^(?:[1-9]|10)$/.test(raw)) return null;
  return Number(raw) * 10;
}

function profileDisplayName(document: HTMLElement) {
  const value = cleanText(
    document.querySelector("h3.main-header")?.textContent,
  );
  return value && value.length <= 80 ? value : null;
}

function profileAvatarUrl(document: HTMLElement, pageUrl: URL) {
  const source = document
    .querySelector(".avatar.avatar-static img")
    ?.getAttribute("src");
  return source ? normalizeBackloggdAvatarUrl(source, pageUrl) : null;
}

export function parseAnubisChallenge(
  html: string,
): ParsedAnubisChallenge | null {
  const document = parse(html);
  const challengeScript = document.querySelector("#anubis_challenge");
  if (!challengeScript) return null;

  let envelope: unknown;
  let basePrefix: unknown = "";
  try {
    envelope = JSON.parse(challengeScript.textContent);
    const basePrefixScript = document.querySelector("#anubis_base_prefix");
    if (basePrefixScript) basePrefix = JSON.parse(basePrefixScript.textContent);
  } catch {
    return null;
  }
  if (!envelope || typeof envelope !== "object") return null;
  const record = envelope as Record<string, unknown>;
  if (!record.rules || typeof record.rules !== "object") return null;
  if (!record.challenge || typeof record.challenge !== "object") return null;
  const rules = record.rules as Record<string, unknown>;
  const challenge = record.challenge as Record<string, unknown>;
  if (
    rules.algorithm !== "fast" ||
    challenge.method !== "fast" ||
    typeof challenge.id !== "string" ||
    !ANUBIS_ID_PATTERN.test(challenge.id) ||
    typeof challenge.randomData !== "string" ||
    !ANUBIS_RANDOM_DATA_PATTERN.test(challenge.randomData) ||
    !Number.isInteger(rules.difficulty) ||
    rules.difficulty !== challenge.difficulty ||
    (rules.difficulty as number) < 0 ||
    (rules.difficulty as number) > MAX_ANUBIS_DIFFICULTY ||
    typeof basePrefix !== "string" ||
    !ANUBIS_BASE_PREFIX_PATTERN.test(basePrefix)
  )
    return null;

  return {
    id: challenge.id,
    randomData: challenge.randomData,
    difficulty: rules.difficulty as number,
    method: "fast",
    basePrefix,
  };
}

export function parseBackloggdGamesPage(
  html: string,
  pageUrl: URL,
  username: string,
): ParsedBackloggdPage {
  const document = parse(html);
  const bodyText = document.body?.textContent.toLowerCase() ?? "";
  const challenge =
    document.querySelector("#anubis_challenge") !== null ||
    document.title.toLowerCase().includes("not a bot") ||
    bodyText.includes("protected by botstopper");
  const privateProfile =
    bodyText.includes("this profile is private") ||
    bodyText.includes("this user's profile is private") ||
    bodyText.includes("este perfil é privado");

  const games = new Map<string, BackloggdSourceGame>();
  const pageUrls = new Set<string>();
  const currentCollection = collectionKind(pageUrl, username);
  for (const anchor of document.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (canonicalHost(url.hostname) !== BACKLOGGD_HOST) continue;

    const gameMatch = url.pathname.toLowerCase().match(GAME_PATH_PATTERN);
    if (gameMatch) {
      const slug = gameMatch[1];
      const previous = games.get(slug);
      const name = sourceName(anchor);
      const rating = personalRating(anchor);
      games.set(slug, {
        slug,
        sourceName: previous?.sourceName ?? name,
        personalRating: previous?.personalRating ?? rating,
        played: previous?.played ?? currentCollection === "played",
        playing: previous?.playing ?? currentCollection === "playing",
        backlog: previous?.backlog ?? currentCollection === "backlog",
        wishlist: previous?.wishlist ?? currentCollection === "wishlist",
      });
      continue;
    }

    if (!isAllowedBackloggdCollectionUrl(url, username)) continue;
    if (collectionKind(url, username) !== currentCollection) continue;
    const page = Number(url.searchParams.get("page") ?? 1);
    if (page > 1)
      pageUrls.add(
        backloggdCollectionUrl(
          username,
          page,
          currentCollection ?? "all",
        ).toString(),
      );
  }

  return {
    games: [...games.values()],
    pageUrls: [...pageUrls],
    challenge,
    privateProfile,
    profileDisplayName: profileDisplayName(document),
    profileAvatarUrl: profileAvatarUrl(document, pageUrl),
  };
}
