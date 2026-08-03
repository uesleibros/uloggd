/**
 * Turning one row of Steam's player summary into what a profile needs.
 *
 * Split out from the fetching so it can be tested without a network and
 * without an API key. The request is plumbing; this is the part with decisions
 * in it, and the decisions are about what the site is willing to claim.
 */

export type SteamPlayer = {
  steamId: string;
  persona: string;
  avatarUrl: string | null;
  /** Set only while the account is in a game and its profile is public. */
  playing: { name: string; appId: string | null } | null;
};

export type SteamSummary = {
  steamid?: string;
  personaname?: string;
  avatarfull?: string;
  gameextrainfo?: string;
  gameid?: string;
};

export function toSteamPlayer(summary: SteamSummary): SteamPlayer | null {
  // No id, no row. Everything downstream is keyed by it, and a player nothing
  // can be matched against would silently never appear.
  if (!summary.steamid) return null;

  const game = summary.gameextrainfo?.trim();
  return {
    steamId: summary.steamid,
    // The numeric id stands in when there is no name, so the interface always
    // has something to draw rather than an empty space where a person is.
    persona: summary.personaname?.trim() || summary.steamid,
    avatarUrl: summary.avatarfull || null,
    // `gameextrainfo` is the only field that names the game. A private or
    // friends-only profile simply omits it, which is Steam honouring its
    // owner's setting, and this site has no business working around that.
    playing: game
      ? {
          name: game,
          // A non-Steam shortcut reports id 0. Kept as null rather than
          // linking to store app 0, which is not a page.
          appId:
            summary.gameid && summary.gameid !== "0" ? summary.gameid : null,
        }
      : null,
  };
}
