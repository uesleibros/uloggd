import "server-only";

/**
 * Reads Steam on the server, with the site's own API key.
 *
 * Every failure resolves to "nothing to show" rather than throwing, for the
 * same reason as Twitch: a profile has to render whether or not Steam is
 * answering, and a "playing now" line is the least important thing on it.
 *
 * The key is optional. Without STEAM_API_KEY the connection still works, since
 * OpenID needs no key; only the display name and the current game go missing,
 * which is a smaller loss than the feature refusing to exist.
 */

const SUMMARIES =
  "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

export type SteamPlayer = {
  steamId: string;
  persona: string;
  avatarUrl: string | null;
  /** Set only while the account is in a game and its profile is public. */
  playing: { name: string; appId: string | null } | null;
};

export function steamConfigured(): boolean {
  return Boolean(process.env.STEAM_API_KEY);
}

/**
 * Player summaries for up to a hundred accounts.
 *
 * Batched because Steam takes a comma-separated list, and a page showing
 * several profiles should cost one request rather than one each.
 *
 * Cached for a minute. "Playing now" arriving thirty seconds late is nobody's
 * problem; a Steam call on every profile view is.
 */
export async function getSteamPlayers(
  steamIds: string[],
): Promise<Map<string, SteamPlayer>> {
  const key = process.env.STEAM_API_KEY;
  const wanted = [...new Set(steamIds.filter(Boolean))].slice(0, 100);
  if (!key || !wanted.length) return new Map();

  try {
    const query = new URLSearchParams({
      key,
      steamids: wanted.join(","),
    });
    const response = await fetch(`${SUMMARIES}?${query}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return new Map();
    const payload = (await response.json()) as {
      response?: {
        players?: Array<{
          steamid?: string;
          personaname?: string;
          avatarfull?: string;
          gameextrainfo?: string;
          gameid?: string;
        }>;
      };
    };
    const players = new Map<string, SteamPlayer>();
    for (const player of payload.response?.players ?? []) {
      if (!player.steamid) continue;
      players.set(player.steamid, {
        steamId: player.steamid,
        persona: player.personaname?.trim() || player.steamid,
        avatarUrl: player.avatarfull || null,
        // `gameextrainfo` is the only field that names the game. A private or
        // friends-only profile simply omits it, which is Steam honouring the
        // person's own setting and this site has no business working around.
        playing: player.gameextrainfo
          ? { name: player.gameextrainfo, appId: player.gameid ?? null }
          : null,
      });
    }
    return players;
  } catch {
    return new Map();
  }
}

/** One account, for a single profile page. */
export async function getSteamPlayer(
  steamId: string | null | undefined,
): Promise<SteamPlayer | null> {
  if (!steamId) return null;
  const players = await getSteamPlayers([steamId]);
  return players.get(steamId) ?? null;
}
