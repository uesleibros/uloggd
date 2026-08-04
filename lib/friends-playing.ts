import type { Game } from "@/lib/igdb";
import { profileOf, type ProfileJoin } from "@/lib/profile-join";

export type FriendPlaying = {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  game: Game;
  updatedAt: string;
};

/** One row of the shelf query, before it becomes a card. */
export type FriendPlayingRow = {
  profile_id: string;
  igdb_id: number;
  updated_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
};

/**
 * Turns the rows into the "friends playing now" shelf: one card per game.
 *
 * Split from the query it feeds because this is the part with the rule in it,
 * and the rule was wrong. It used to be one card per person per game, so a
 * game three friends were all playing took three of the ten slots with the
 * same cover, and the shelf read as a bug rather than as a coincidence.
 *
 * Rows arrive newest first, so the friend who survives a collision is the one
 * who touched it most recently. The limit counts cards rather than rows, so
 * duplicates that were dropped do not eat the space they left behind.
 */
export function pickFriendsPlaying(
  rows: FriendPlayingRow[],
  gamesById: Map<number, Game>,
  limit: number,
): FriendPlaying[] {
  const seen = new Set<number>();
  return rows
    .flatMap((row): FriendPlaying[] => {
      const profile = profileOf(row.profiles);
      const gameId = Number(row.igdb_id);
      const game = gamesById.get(gameId);
      // A private profile embeds as null, and IGDB does not always know an id
      // the library holds. Neither can become a card with nothing on it.
      if (!profile?.username || !game || seen.has(gameId)) return [];
      seen.add(gameId);
      return [
        {
          profileId: row.profile_id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          verified: Boolean(profile.verified),
          game,
          updatedAt: row.updated_at,
        },
      ];
    })
    .slice(0, limit);
}
