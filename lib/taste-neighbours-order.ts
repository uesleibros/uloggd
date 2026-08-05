import type { ConnectionPerson } from "@/components/social/connection-card";

/**
 * Putting the ranked ids back together with the profiles they name.
 *
 * Its own module, free of `server-only`, for the same reason the idle rule
 * is: a test cannot import anything the bundler reserves for the server.
 *
 * The trap it exists for is quiet. `select ... in (ids)` returns rows in
 * whatever order the planner finds them, so building the list by walking the
 * profiles would hand back a shelf sorted by nothing at all — and it would
 * look completely fine, because every name on it is still a real suggestion.
 * The order is the entire product of the ranking.
 */

export type RankedNeighbour = {
  profile_id: string;
  shared_games: number;
  follows_viewer: boolean;
};

export type NeighbourProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean | null;
  account_type?: "PERSON" | "ORGANIZATION";
};

export type TasteNeighbour = {
  person: ConnectionPerson;
  /** Games in both libraries. Shown as-is; the ranking uses another number. */
  sharedGames: number;
};

export function orderNeighbours(
  ranked: RankedNeighbour[],
  profiles: NeighbourProfile[],
): TasteNeighbour[] {
  const byId = new Map(profiles.map((row) => [row.id, row]));
  return ranked.flatMap((row): TasteNeighbour[] => {
    const person = byId.get(row.profile_id);
    // No profile row, or a half-registered account with no username: there is
    // no page to send anyone to, so the suggestion is dropped rather than
    // drawn as a card that goes nowhere.
    if (!person?.username) return [];
    return [
      {
        person: {
          id: person.id,
          username: person.username,
          display_name: person.display_name,
          bio: person.bio,
          avatar_url: person.avatar_url,
          verified: Boolean(person.verified),
          account_type: person.account_type,
          // The query only ever returns people the viewer does not follow, so
          // this is not read from the row: it is why the row exists.
          viewer_follows: false,
          follows_viewer: row.follows_viewer,
        },
        sharedGames: row.shared_games,
      },
    ];
  });
}
