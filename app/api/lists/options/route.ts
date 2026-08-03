import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

/** Lightweight owner-only choices for contextual add-to-list dialogs. */
export async function GET() {
  const [supabase, user] = await Promise.all([getSupabase(), getAuthUser()]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("game_lists")
    .select("id,name")
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[lists/options] owner list query failed", error);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  return Response.json(
    { lists: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
