import "server-only";

/**
 * Reads Twitch on the server, with the site's own credentials.
 *
 * Never from the browser: the client secret is a secret, and a per-visitor
 * request would also spend the site's rate limit once per person looking at a
 * profile rather than once per channel.
 *
 * Every failure resolves to "not live" rather than throwing. A profile has to
 * render whether or not Twitch is answering, and a stream card is the least
 * important thing on it.
 */

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX = "https://api.twitch.tv/helix";

export type TwitchStream = {
  title: string;
  gameName: string | null;
  viewers: number;
  startedAt: string;
  thumbnailUrl: string;
  login: string;
};

/**
 * The app access token, cached until shortly before it expires.
 *
 * Client-credentials tokens last about sixty days and Twitch rate-limits the
 * endpoint that mints them, so asking for one per request is both wasteful and
 * a way to get locked out. Held in module scope, which on a serverless runtime
 * means per warm instance: the worst case is one token per instance, not one
 * per request.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;

async function appToken(): Promise<string | null> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now())
    return cachedToken.value;

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) return null;
    cachedToken = {
      value: payload.access_token,
      // A minute of margin, so a token that expires mid-flight is renewed
      // before it is used rather than after it fails.
      expiresAt:
        Date.now() + Math.max(0, (payload.expires_in ?? 3600) - 60) * 1000,
    };
    return cachedToken.value;
  } catch {
    return null;
  }
}

/**
 * Which of these channels are live right now.
 *
 * Batched: Helix takes up to a hundred logins per call, and a page showing
 * several profiles should cost one request rather than one each.
 *
 * Cached for a minute. A stream that started thirty seconds ago showing up
 * late is nobody's problem; a profile view costing a Twitch call every time
 * is.
 */
export async function getLiveStreams(
  logins: string[],
): Promise<Map<string, TwitchStream>> {
  const wanted = [
    ...new Set(logins.filter(Boolean).map((login) => login.toLowerCase())),
  ].slice(0, 100);
  if (!wanted.length) return new Map();

  const token = await appToken();
  if (!token) return new Map();

  try {
    const query = new URLSearchParams();
    for (const login of wanted) query.append("user_login", login);
    const response = await fetch(`${HELIX}/streams?${query}`, {
      headers: {
        "Client-Id": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      // A rejected token is the one failure worth reacting to: it means the
      // cached one died early, and holding it would keep every later call
      // failing for as long as the instance lives.
      if (response.status === 401) cachedToken = null;
      return new Map();
    }
    const payload = (await response.json()) as {
      data?: Array<{
        user_login?: string;
        title?: string;
        game_name?: string;
        viewer_count?: number;
        started_at?: string;
        thumbnail_url?: string;
      }>;
    };
    const live = new Map<string, TwitchStream>();
    for (const stream of payload.data ?? []) {
      if (!stream.user_login) continue;
      live.set(stream.user_login.toLowerCase(), {
        title: stream.title?.trim() || "",
        gameName: stream.game_name?.trim() || null,
        viewers: stream.viewer_count ?? 0,
        startedAt: stream.started_at ?? new Date().toISOString(),
        // Helix returns the thumbnail with size placeholders in the path.
        thumbnailUrl: (stream.thumbnail_url ?? "")
          .replace("{width}", "640")
          .replace("{height}", "360"),
        login: stream.user_login.toLowerCase(),
      });
    }
    return live;
  } catch {
    return new Map();
  }
}

/** One channel, for a single profile page. */
export async function getLiveStream(
  login: string | null | undefined,
): Promise<TwitchStream | null> {
  if (!login) return null;
  const live = await getLiveStreams([login]);
  return live.get(login.toLowerCase()) ?? null;
}
