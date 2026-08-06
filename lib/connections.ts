import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectionPerson } from "@/components/social/connection-card";

export type ConnectionTab = "followers" | "following";

export type ConnectionRow = {
  created_at: string;
  person: ConnectionPerson;
};

export function resolveViewerRelationship(options: {
  viewerId: string;
  profileId: string;
  tab: ConnectionTab;
  personId: string;
  followed: ReadonlySet<string>;
  followsViewer: ReadonlySet<string>;
}) {
  return {
    viewer_follows:
      (options.viewerId === options.profileId && options.tab === "following") ||
      options.followed.has(options.personId),
    follows_viewer:
      (options.viewerId === options.profileId && options.tab === "followers") ||
      options.followsViewer.has(options.personId),
  };
}

/**
 * Which of these people the viewer follows, and which follow back.
 *
 * Two queries rather than one round trip per card. Extracted because the
 * connections list was not the only place that needs it: the people search
 * offered "follow" to everybody, including accounts the viewer had already
 * followed, which reads as the site having forgotten them.
 */
export async function getFollowState(
  supabase: SupabaseClient,
  viewerId: string | null,
  ids: string[],
): Promise<{ followed: Set<string>; followsViewer: Set<string> }> {
  const others = ids.filter((id) => id !== viewerId);
  if (!viewerId || !others.length)
    return { followed: new Set(), followsViewer: new Set() };
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", others),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", viewerId)
      .in("follower_id", others),
  ]);
  return {
    followed: new Set(
      ((outgoing ?? []) as { following_id: string }[]).map(
        (row) => row.following_id,
      ),
    ),
    followsViewer: new Set(
      ((incoming ?? []) as { follower_id: string }[]).map(
        (row) => row.follower_id,
      ),
    ),
  };
}

/**
 * Games the viewer has in common with each of these people.
 *
 * The suggestion shelf computes this for the twelve it picked; this answers it
 * for anybody, which is what a list of search results needs. Empty for a
 * signed-out visitor, who has no library to compare against.
 */
export async function getSharedLibraryCounts(
  supabase: SupabaseClient,
  viewerId: string | null,
  ids: string[],
): Promise<Map<string, number>> {
  const others = ids.filter((id) => id !== viewerId);
  if (!viewerId || !others.length) return new Map();
  const { data } = await supabase.rpc("shared_library_counts", {
    targets: others,
  });
  return new Map(
    ((data ?? []) as { profile_id: string; shared_games: number }[]).map(
      (row) => [row.profile_id, row.shared_games],
    ),
  );
}

// Shared by the server page and the client load-more: one keyset page of a
// profile's network with the person embedded, newest follows first.
export async function getConnectionsPage(
  supabase: SupabaseClient,
  options: {
    profileId: string;
    tab: ConnectionTab;
    query?: string;
    before?: string;
    limit: number;
    /** The signed-in viewer, when there is one, for the mutual markers. */
    viewerId?: string | null;
  },
): Promise<ConnectionRow[]> {
  const followers = options.tab === "followers";
  const fk = followers
    ? "follows_follower_id_fkey"
    : "follows_following_id_fkey";
  let request = supabase
    .from("follows")
    .select(
      `created_at,person:profiles!${fk}!inner(id,username,display_name,bio,avatar_url,verified,account_type)`,
    )
    .eq(followers ? "following_id" : "follower_id", options.profileId)
    .order("created_at", { ascending: false })
    .limit(options.limit);
  const sanitized = options.query?.replace(/[%_,()]/g, "").trim();
  if (sanitized)
    request = request.or(
      `username.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`,
      { referencedTable: "person" },
    );
  if (options.before) request = request.lt("created_at", options.before);
  const { data } = await request;
  const rows = ((data ?? []) as unknown as ConnectionRow[]).filter(
    (row) => row.person,
  );
  return withViewerRelationship(supabase, rows, {
    viewerId: options.viewerId ?? null,
    profileId: options.profileId,
    tab: options.tab,
  });
}

/**
 * Marks which people on this page the viewer already knows.
 *
 * Scoped to the ids the page returned rather than loading the viewer's whole
 * graph, and done here rather than in each caller so the server page and the
 * client "load more" cannot end up showing different markers for the same
 * person as someone scrolls.
 *
 * Deliberately not a reordering. Putting mutuals first would mean abandoning
 * the keyset pagination this list is built on, since the sort key has to be
 * the cursor, and that pagination is why the page stopped loading every
 * follow id in the first place.
 */
async function withViewerRelationship(
  supabase: SupabaseClient,
  rows: ConnectionRow[],
  context: {
    viewerId: string | null;
    profileId: string;
    tab: ConnectionTab;
  },
): Promise<ConnectionRow[]> {
  const { viewerId, profileId, tab } = context;
  if (!viewerId || rows.length === 0) return rows;
  const ids = rows.map((row) => row.person.id).filter((id) => id !== viewerId);
  if (ids.length === 0) return rows;

  const { followed, followsViewer } = await getFollowState(
    supabase,
    viewerId,
    ids,
  );

  return rows.map((row) => ({
    ...row,
    person: {
      ...row.person,
      // When the viewer is looking at their own graph, the row itself proves
      // one direction of the relationship. Do not replace that known truth
      // with `false` just because the complementary batch query returned no
      // rows or hit a transient read-policy/cache problem.
      ...resolveViewerRelationship({
        viewerId,
        profileId,
        tab,
        personId: row.person.id,
        followed,
        followsViewer,
      }),
    },
  }));
}
