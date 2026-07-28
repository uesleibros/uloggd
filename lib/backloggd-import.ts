import "server-only";

import { solveAnubisChallenge } from "@/lib/backloggd/anubis";
import {
  backloggdCollectionUrl,
  isAllowedBackloggdCollectionUrl,
  parseAnubisChallenge,
  parseBackloggdGamesPage,
  type BackloggdSourceGame,
  type ParsedBackloggdPage,
} from "@/lib/backloggd/parser";
import { getGamesBySlugs, type Game } from "@/lib/igdb";

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_GAMES = 2_000;
const FETCH_CONCURRENCY = 4;
const MAX_CHALLENGE_ATTEMPTS = 2;
const MAX_COOKIE_BYTES = 8 * 1024;
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
  stage: "partner_configuration" | "source_fetch" | "source_challenge";
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

type BackloggdSession = {
  headers: Headers;
  cookies: Map<string, string>;
  challengeAttempts: number;
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

function splitCombinedSetCookie(value: string) {
  return value.split(/,(?=\s*[!#$%&'*+.^_`|~0-9A-Za-z-]+=)/g);
}

function responseSetCookies(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = headers.getSetCookie?.();
  if (values?.length) return values;
  const combined = response.headers.get("set-cookie");
  return combined ? splitCombinedSetCookie(combined) : [];
}

function captureResponseCookies(response: Response, session: BackloggdSession) {
  for (const setCookie of responseSetCookies(response)) {
    const delimiter = setCookie.indexOf(";");
    const pair = (
      delimiter >= 0 ? setCookie.slice(0, delimiter) : setCookie
    ).trim();
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (
      name.length > 80 ||
      !PARTNER_HEADER_NAME_PATTERN.test(name) ||
      value.length > 4_096 ||
      /[\r\n;\0]/.test(value)
    )
      continue;
    if (value) session.cookies.set(name, value);
    else session.cookies.delete(name);
  }
  const totalBytes = [...session.cookies].reduce(
    (total, [name, value]) => total + name.length + value.length + 2,
    0,
  );
  if (totalBytes > MAX_COOKIE_BYTES)
    throw new BackloggdImportError("invalid_source", {
      stage: "source_challenge",
    });
}

function requestHeaders(session: BackloggdSession) {
  const headers = new Headers(session.headers);
  if (session.cookies.size)
    headers.set(
      "Cookie",
      [...session.cookies]
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    );
  return headers;
}

async function fetchBackloggd(url: URL, session: BackloggdSession) {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: requestHeaders(session),
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
  captureResponseCookies(response, session);
  return response;
}

async function fetchCollectionPage(
  initialUrl: URL,
  username: string,
  session: BackloggdSession,
) {
  let url = initialUrl;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetchBackloggd(url, session);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
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

async function passAnubisChallenge(
  html: string,
  sourceUrl: URL,
  username: string,
  session: BackloggdSession,
) {
  if (session.challengeAttempts >= MAX_CHALLENGE_ATTEMPTS)
    throw new BackloggdImportError("partner_access_required", {
      stage: "source_challenge",
    });
  const challenge = parseAnubisChallenge(html);
  if (!challenge)
    throw new BackloggdImportError("partner_access_required", {
      stage: "source_challenge",
    });
  const proof = solveAnubisChallenge(challenge);
  if (!proof)
    throw new BackloggdImportError("partner_access_required", {
      stage: "source_challenge",
    });

  session.challengeAttempts += 1;
  const passUrl = new URL(
    `${challenge.basePrefix}/.within.website/x/cmd/anubis/api/pass-challenge`,
    sourceUrl.origin,
  );
  passUrl.searchParams.set("id", challenge.id);
  passUrl.searchParams.set("response", proof.hash);
  passUrl.searchParams.set("nonce", String(proof.nonce));
  passUrl.searchParams.set("redir", sourceUrl.toString());
  passUrl.searchParams.set("elapsedTime", String(proof.elapsedTime));

  const response = await fetchBackloggd(passUrl, session);
  const location = response.headers.get("location");
  await response.body?.cancel();
  const redirect = location ? new URL(location, passUrl) : null;
  if (
    ![301, 302, 303, 307, 308].includes(response.status) ||
    !redirect ||
    !isAllowedBackloggdCollectionUrl(redirect, username)
  )
    throw new BackloggdImportError("partner_access_required", {
      stage: "source_challenge",
      upstreamStatus: response.status,
    });
  console.info("[backloggd-import] source challenge solved", {
    sourceUsername: username,
    difficulty: challenge.difficulty,
    nonce: proof.nonce,
    durationMs: proof.elapsedTime,
    attempt: session.challengeAttempts,
  });
}

async function fetchParsedCollectionPage(
  url: URL,
  username: string,
  session: BackloggdSession,
): Promise<{ page: ParsedBackloggdPage; finalUrl: URL }> {
  let response = await fetchCollectionPage(url, username, session);
  let page = parseBackloggdGamesPage(
    response.html,
    response.finalUrl,
    username,
  );
  if (!page.challenge) return { page, finalUrl: response.finalUrl };

  await passAnubisChallenge(
    response.html,
    response.finalUrl,
    username,
    session,
  );
  response = await fetchCollectionPage(url, username, session);
  page = parseBackloggdGamesPage(response.html, response.finalUrl, username);
  if (page.challenge)
    throw new BackloggdImportError("partner_access_required", {
      stage: "source_challenge",
    });
  return { page, finalUrl: response.finalUrl };
}

export type BackloggdValidatedImport = {
  sourceGames: BackloggdSourceGame[];
  validatedGames: Game[];
  unmatchedGames: BackloggdSourceGame[];
  sourceDisplayName: string;
  sourceAvatarUrl: string | null;
  sourcePageCount: number;
};

export async function collectAndValidateBackloggdGames(
  username: string,
  options: CollectOptions = {},
): Promise<BackloggdValidatedImport> {
  const session: BackloggdSession = {
    headers: partnerRequestHeaders(options.userAgent),
    cookies: new Map(),
    challengeAttempts: 0,
  };
  const firstUrl = backloggdCollectionUrl(username);
  const first = await fetchParsedCollectionPage(firstUrl, username, session);
  const firstPage = first.page;
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
        const response = await fetchParsedCollectionPage(
          url,
          username,
          session,
        );
        return response.page;
      }),
    );
    for (const page of pages) {
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
    sourceDisplayName: firstPage.profileDisplayName ?? username,
    sourceAvatarUrl: firstPage.profileAvatarUrl,
    sourcePageCount: seenPages.size,
  };
}
