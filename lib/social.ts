import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds } from "@/lib/igdb";
import { getAuthUser } from "@/lib/supabase/auth";
import { resolveGameCover } from "@/lib/game-cover";
import type { SocialEntry } from "@/components/social/activity-stream";

type ProfileJoin = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
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
function journeyTitleOf(value: unknown): string | null {
  const joined = Array.isArray(value) ? value[0] : value;
  if (joined && typeof joined === "object" && "title" in joined)
    return String((joined as { title: unknown }).title ?? "") || null;
  return null;
}

export async function getActivity(
  supabase: SupabaseClient,
  options: {
    profileId?: string;
    gameId?: number;
    limit?: number;
    viewerId?: string | null;
  } = {},
) {
  const limit = options.limit ?? 30;
  let reviewsQuery = supabase
    .from("reviews")
    .select(
      "id,profile_id,igdb_id,game_slug,rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,created_at,updated_at,journey_id,journeys!reviews_journey_id_fkey(title),profiles!reviews_profile_id_fkey(username,display_name,avatar_url,verified)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  let diaryQuery = supabase
    .from("diary_entries")
    .select(
      "id,profile_id,igdb_id,game_slug,played_on,ended_on,minutes,note,marks_start,marks_finish,contains_spoilers,visibility,created_at,updated_at,journey_id,journeys!diary_entries_journey_id_fkey(title),profiles!diary_entries_profile_id_fkey(username,display_name,avatar_url,verified)",
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
  const viewerId =
    options.viewerId === undefined
      ? (await getAuthUser())?.id
      : options.viewerId;
  const { data: covers } =
    viewerId && games.length
      ? await supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", viewerId)
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
  const reviewIds = (reviews ?? []).map((row) => row.id);
  const diaryIds = (diary ?? []).map((row) => row.id);
  const [reviewLikes, diaryLikes] = await Promise.all([
    reviewIds.length
      ? supabase.rpc("get_content_likes", {
          target_type: "review",
          target_ids: reviewIds,
        })
      : { data: [] },
    diaryIds.length
      ? supabase.rpc("get_content_likes", {
          target_type: "diary",
          target_ids: diaryIds,
        })
      : { data: [] },
  ]);
  const likesById = new Map(
    [...(reviewLikes.data ?? []), ...(diaryLikes.data ?? [])].map(
      (row: {
        content_id: string;
        like_count: number;
        liked_by_viewer: boolean;
      }) => [row.content_id, row],
    ),
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
          rating:
            review && typeof row.rating === "number" ? row.rating : undefined,
          ratingMode: review
            ? (row.rating_mode as SocialEntry["ratingMode"])
            : undefined,
          recommended: review ? (row.recommended as boolean | null) : undefined,
          title: review ? String(row.title ?? "") || null : undefined,
          aspects: review
            ? (row.aspect_ratings as SocialEntry["aspects"])
            : undefined,
          mastered: review ? Boolean(row.mastered) : undefined,
          replay: review ? Boolean(row.replay) : undefined,
          platform: review ? String(row.platform ?? "") || null : undefined,
          startedOn: review
            ? String(row.started_on ?? "") || null
            : undefined,
          finishedOn: review
            ? String(row.finished_on ?? "") || null
            : undefined,
          content: String((review ? row.content : row.note) ?? "") || null,
          playedOn: review ? undefined : String(row.played_on),
          endedOn: review
            ? undefined
            : String(row.ended_on ?? "") || null,
          minutes: review ? undefined : (row.minutes as number | null),
          marksStart: review ? undefined : Boolean(row.marks_start),
          marksFinish: review ? undefined : Boolean(row.marks_finish),
          journeyId: String(row.journey_id ?? "") || null,
          journeyTitle: journeyTitleOf(row.journeys) || null,
          spoilers: Boolean(row.contains_spoilers),
          visibility: row.visibility as SocialEntry["visibility"],
          createdAt: row.created_at,
          updatedAt: String(row.updated_at ?? "") || undefined,
          likes: Number(likesById.get(row.id)?.like_count ?? 0),
          likedByViewer: Boolean(likesById.get(row.id)?.liked_by_viewer),
        },
      ];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
