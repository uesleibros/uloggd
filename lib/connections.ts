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
  },
): Promise<ConnectionRow[]> {
  const followers = options.tab === "followers";
  const fk = followers
    ? "follows_follower_id_fkey"
    : "follows_following_id_fkey";
  let request = supabase
    .from("follows")
    .select(
      `created_at,person:profiles!${fk}!inner(id,username,display_name,bio,avatar_url,verified)`,
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
  return ((data ?? []) as unknown as ConnectionRow[]).filter(
    (row) => row.person,
  );
}
