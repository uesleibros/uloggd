import "server-only";

import {
  backloggdCollectionUrl,
  isAllowedBackloggdCollectionUrl,
  parseBackloggdGamesPage,
  type BackloggdSourceGame,
} from "@/lib/backloggd/parser";
import { getGamesBySlugs, type Game } from "@/lib/igdb";

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 40;
const MAX_GAMES = 2_000;
const FETCH_CONCURRENCY = 4;
const PARTNER_HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const RESERVED_PARTNER_HEADERS = new Set([
  "accept",
  "accept-language",
  "connection",
  "content-length",
  "cookie",
  "host",
  "origin",
  "referer",
  "transfer-encoding",
  "user-agent",
]);

export type BackloggdImportErrorCode =
  | "partner_access_required"
  | "profile_not_found"
  | "profile_private"
  | "source_too_large"
  | "source_timeout"
  | "source_unavailable"
  | "invalid_source"
  | "partner_configuration_invalid";

type BackloggdImportErrorContext = {
  stage: "partner_configuration" | "source_fetch" | "source_parse";
  upstreamStatus?: number;
};

export class BackloggdImportError extends Error {
  constructor(
    public readonly code: BackloggdImportErrorCode,
    public readonly context?: BackloggdImportErrorContext,
  ) {
    super(code);
    this.name = "BackloggdImportError";
  }
}

type CollectOptions = {
  userAgent?: string;
};

function partnerRequestHeaders(userAgent?: string) {
  const configuredUserAgent = process.env.BACKLOGGD_PARTNER_USER_AGENT?.trim();
  const headerName = process.env.BACKLOGGD_PARTNER_HEADER_NAME?.trim();
  const headerValue = process.env.BACKLOGGD_PARTNER_HEADER_VALUE?.trim();
  if ((headerName && !headerValue) || (!headerName && headerValue))
    throw new BackloggdImportError("partner_configuration_invalid", {
      stage: "partner_configuration",
    });

  const effectiveUserAgent =
    configuredUserAgent ||
    userAgent ||
    "uloggd-partner-import/1.0 (+https://uloggd.com)";
  if (effectiveUserAgent.length > 256 || /[\r\n\0]/.test(effectiveUserAgent))
    throw new BackloggdImportError("partner_configuration_invalid", {
      stage: "partner_configuration",
    });

  const headers = new Headers({
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.8",
    "User-Agent": effectiveUserAgent,
  });
  if (!headerName || !headerValue) return headers;

  const normalizedName = headerName.toLowerCase();
  if (
    headerName.length > 80 ||
    !PARTNER_HEADER_NAME_PATTERN.test(headerName) ||
    RESERVED_PARTNER_HEADERS.has(normalizedName) ||
    normalizedName.startsWith("sec-") ||
    headerValue.length > 2_048 ||
    /[\r\n\0]/.test(headerValue)
  )
    throw new BackloggdImportError("partner_configuration_invalid", {
      stage: "partner_configuration",
    });

  headers.set(headerName, headerValue);
  return headers;
}

async function readBoundedHtml(response: Response) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_HTML_BYTES)
    throw new BackloggdImportError("source_too_large");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new BackloggdImportError("source_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

async function fetchCollectionPage(
  initialUrl: URL,
  username: string,
  headers: Headers,
) {
  let url = initialUrl;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers,
      });
    } catch (error) {
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      throw new BackloggdImportError(
        timedOut ? "source_timeout" : "source_unavailable",
        { stage: "source_fetch" },
      );
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new BackloggdImportError("invalid_source");
      const next = new URL(location, url);
      if (!isAllowedBackloggdCollectionUrl(next, username))
        throw new BackloggdImportError("invalid_source");
      url = next;
      continue;
    }
    if (response.status === 404)
      throw new BackloggdImportError("profile_not_found");
    if (
      response.status === 403 &&
      response.headers.get("cf-mitigated")?.toLowerCase() === "challenge"
    )
      throw new BackloggdImportError("partner_access_required", {
        stage: "source_fetch",
        upstreamStatus: response.status,
      });
    if (response.status === 401 || response.status === 403)
      throw new BackloggdImportError("profile_private");
    if (!response.ok)
      throw new BackloggdImportError("source_unavailable", {
        stage: "source_fetch",
        upstreamStatus: response.status,
      });
    const contentType = response.headers.get("content-type")?.toLowerCase();
    if (!contentType?.includes("text/html"))
      throw new BackloggdImportError("invalid_source");
    return { html: await readBoundedHtml(response), finalUrl: url };
  }
  throw new BackloggdImportError("invalid_source");
}

export type BackloggdValidatedImport = {
  sourceGames: BackloggdSourceGame[];
  validatedGames: Game[];
  unmatchedGames: BackloggdSourceGame[];
};

export async function collectAndValidateBackloggdGames(
  username: string,
  options: CollectOptions = {},
): Promise<BackloggdValidatedImport> {
  const headers = partnerRequestHeaders(options.userAgent);
  const firstUrl = backloggdCollectionUrl(username);
  const first = await fetchCollectionPage(firstUrl, username, headers);
  const firstPage = parseBackloggdGamesPage(
    first.html,
    first.finalUrl,
    username,
  );
  if (firstPage.challenge)
    throw new BackloggdImportError("partner_access_required", {
      stage: "source_parse",
    });
  if (firstPage.privateProfile)
    throw new BackloggdImportError("profile_private");
  if (firstPage.games.length > MAX_GAMES)
    throw new BackloggdImportError("source_too_large");

  const sourceGames = new Map(firstPage.games.map((game) => [game.slug, game]));
  const seenPages = new Set([first.finalUrl.toString()]);
  const queuedPages = new Set(firstPage.pageUrls);
  const queue = [...queuedPages];

  while (queue.length) {
    if (seenPages.size + queue.length > MAX_PAGES)
      throw new BackloggdImportError("source_too_large");
    const batch = queue.splice(0, FETCH_CONCURRENCY);
    const pages = await Promise.all(
      batch.map(async (href) => {
        const url = new URL(href);
        seenPages.add(url.toString());
        const response = await fetchCollectionPage(url, username, headers);
        return parseBackloggdGamesPage(
          response.html,
          response.finalUrl,
          username,
        );
      }),
    );
    for (const page of pages) {
      if (page.challenge)
        throw new BackloggdImportError("partner_access_required", {
          stage: "source_parse",
        });
      if (page.privateProfile)
        throw new BackloggdImportError("profile_private");
      for (const game of page.games) sourceGames.set(game.slug, game);
      if (sourceGames.size > MAX_GAMES)
        throw new BackloggdImportError("source_too_large");
      for (const href of page.pageUrls) {
        if (seenPages.has(href) || queuedPages.has(href)) continue;
        queuedPages.add(href);
        queue.push(href);
      }
    }
  }

  const source = [...sourceGames.values()];
  const eligible = source.filter((game) => game.slug.length <= 80);
  const validatedGames = await getGamesBySlugs(
    eligible.map((game) => game.slug),
  );
  const validatedSlugs = new Set(validatedGames.map((game) => game.slug));
  return {
    sourceGames: source,
    validatedGames,
    unmatchedGames: source.filter((game) => !validatedSlugs.has(game.slug)),
  };
}
