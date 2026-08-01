import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectionPerson } from "@/components/social/connection-card";

export type ConnectionTab = "followers" | "following";

export type ConnectionRow = {
  created_at: string;
  person: ConnectionPerson;
};

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
  return withViewerRelationship(supabase, rows, options.viewerId ?? null);
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
  viewerId: string | null,
): Promise<ConnectionRow[]> {
  if (!viewerId || rows.length === 0) return rows;
  const ids = rows.map((row) => row.person.id).filter((id) => id !== viewerId);
  if (ids.length === 0) return rows;

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", ids),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", viewerId)
      .in("follower_id", ids),
  ]);

  const followed = new Set(
    ((outgoing ?? []) as { following_id: string }[]).map(
      (row) => row.following_id,
    ),
  );
  const followsViewer = new Set(
    ((incoming ?? []) as { follower_id: string }[]).map(
      (row) => row.follower_id,
    ),
  );

  return rows.map((row) => ({
    ...row,
    person: {
      ...row.person,
      viewer_follows: followed.has(row.person.id),
      follows_viewer: followsViewer.has(row.person.id),
    },
  }));
}
