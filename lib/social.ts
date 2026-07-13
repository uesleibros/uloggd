import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import type { SocialEntry } from "@/components/social/activity-stream";

type ProfileJoin = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};
type Row = {
  id: string;
  profile_id: string;
  igdb_id: number;
  game_slug: string;
  created_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
};
function profileOf(value: Row["profiles"]): ProfileJoin | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getActivity(
  supabase: SupabaseClient,
  options: { profileId?: string; gameId?: number; limit?: number } = {},
) {
  const limit = options.limit ?? 30;
  let reviewsQuery = supabase
    .from("reviews")
    .select(
      "id,profile_id,igdb_id,game_slug,rating,content,contains_spoilers,visibility,created_at,profiles!reviews_profile_id_fkey(username,display_name,avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  let diaryQuery = supabase
    .from("diary_entries")
    .select(
      "id,profile_id,igdb_id,game_slug,played_on,minutes,note,contains_spoilers,visibility,created_at,profiles!diary_entries_profile_id_fkey(username,display_name,avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (options.profileId) {
    reviewsQuery = reviewsQuery.eq("profile_id", options.profileId);
    diaryQuery = diaryQuery.eq("profile_id", options.profileId);
  }
  if (options.gameId) {
    reviewsQuery = reviewsQuery.eq("igdb_id", options.gameId);
    diaryQuery = diaryQuery.eq("igdb_id", options.gameId);
  }
  const [{ data: reviews }, { data: diary }] = await Promise.all([
    reviewsQuery,
    diaryQuery,
  ]);
  const rows = [...(reviews ?? []), ...(diary ?? [])] as unknown as (Row &
    Record<string, unknown>)[];
  const games = await getGamesByIds(rows.map((row) => row.igdb_id));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: covers } =
    user && games.length
      ? await supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", user.id)
          .in(
            "igdb_id",
            games.map((game) => game.id),
          )
      : { data: [] };
  const coversById = new Map(
    (covers ?? []).map((cover) => [cover.igdb_id, cover.custom_cover_url]),
  );
  const byId = new Map(
    games.map((game) => [
      game.id,
      {
        ...game,
        coverUrl: resolveGameCover(game.coverUrl, coversById.get(game.id)),
      },
    ]),
  );
  return rows
    .flatMap((row): SocialEntry[] => {
      const profile = profileOf(row.profiles);
      if (!profile?.username) return [];
      const review = "rating" in row;
      return [
        {
          id: row.id,
          kind: review ? "review" : "diary",
          profileId: row.profile_id,
          profile,
          igdbId: row.igdb_id,
          gameSlug: row.game_slug,
          game: byId.get(row.igdb_id) ?? null,
          rating: review ? Number(row.rating) : undefined,
          content: String((review ? row.content : row.note) ?? "") || null,
          playedOn: review ? undefined : String(row.played_on),
          minutes: review ? undefined : (row.minutes as number | null),
          spoilers: Boolean(row.contains_spoilers),
          visibility: row.visibility as SocialEntry["visibility"],
          createdAt: row.created_at,
        },
      ];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
