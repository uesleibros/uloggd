import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

/** Lightweight owner-only choices for contextual add-to-list dialogs. */
export async function GET(request: Request) {
  const [supabase, user] = await Promise.all([getSupabase(), getAuthUser()]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const gameId = Number(new URL(request.url).searchParams.get("gameId"));
  if (!Number.isSafeInteger(gameId) || gameId <= 0)
    return Response.json({ error: "invalid_game" }, { status: 400 });

  const { data, error } = await supabase
    .from("game_lists")
    .select("id,name")
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[lists/options] owner list query failed", error);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  const listIds = (data ?? []).map((list) => list.id);
  const membership = listIds.length
    ? await supabase
        .from("game_list_items")
        .select("list_id")
        .eq("igdb_id", gameId)
        .in("list_id", listIds)
    : { data: [], error: null };

  if (membership.error) {
    console.error("[lists/options] membership query failed", membership.error);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  const memberships = new Set(
    (membership.data ?? []).map((item) => item.list_id),
  );

  return Response.json(
    {
      lists: (data ?? []).map((list) => ({
        ...list,
        containsGame: memberships.has(list.id),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
