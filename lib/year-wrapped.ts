import "server-only";
import { getOgSupabase } from "@/lib/supabase/og";

export const MIN_WRAPPED_YEAR = 2000;

export function parseWrappedYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  const current = new Date().getUTCFullYear();
  return year >= MIN_WRAPPED_YEAR && year <= current ? year : null;
}

/**
 * The numbers behind the year card.
 *
 * Read without cookies: its only caller is the share card, which is fetched by
 * link previewers that send none, and a `cookies()` call would opt the route
 * out of every cache Next has.
 */
export async function getYearShareSummary(username: string, year: number) {
  const supabase = getOgSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name")
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username) return null;

  const [{ data: sessions }, { count: reviewCount }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("igdb_id,minutes")
      .eq("profile_id", profile.id)
      .gte("played_on", `${year}-01-01`)
      .lte("played_on", `${year}-12-31`),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .gte("created_at", `${year}-01-01`)
      .lt("created_at", `${year + 1}-01-01`),
  ]);

  const rows = sessions ?? [];
  return {
    profile,
    sessions: rows.length,
    games: new Set(rows.map((session) => session.igdb_id)).size,
    minutes: rows.reduce((total, session) => total + (session.minutes ?? 0), 0),
    reviews: reviewCount ?? 0,
  };
}
