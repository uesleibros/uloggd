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
  public_id?: string;
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
    /** Several authors at once, for the following feed. */
    profileIds?: string[];
    gameId?: number;
    limit?: number;
    viewerId?: string | null;
    before?: string;
    kinds?: Array<"review" | "diary" | "screenshot">;
    rating?: "rated" | "great" | "positive" | "mixed" | "low" | "unrated";
    spoilers?: "all" | "hide" | "only";
    order?: "recent" | "oldest" | "rating";
    search?: string;
  } = {},
) {
  // An empty author list means "nobody I follow", which is not the same as
  // "no filter" — without this the feed would show the whole platform.
  if (options.profileIds && !options.profileIds.length) return [];
  const limit = options.limit ?? 30;
  const includeReviews = !options.kinds || options.kinds.includes("review");
  const includeDiary = !options.kinds || options.kinds.includes("diary");
  const includeScreenshots =
    !options.kinds || options.kinds.includes("screenshot");
  const oldestFirst = options.order === "oldest";
  const searchPattern = options.search
    ?.trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 12)
    .join("%");
  const viewerIdPromise =
    options.viewerId === undefined
      ? getAuthUser().then((user) => user?.id ?? null)
      : Promise.resolve(options.viewerId);
  const viewerPreferencePromise = viewerIdPromise.then(async (viewerId) => {
    if (!viewerId) return null;
    const { data } = await supabase
      .from("profiles")
      .select("custom_cover_scope")
      .eq("id", viewerId)
      .maybeSingle();
    return data;
  });
  let reviewsQuery = supabase
    .from("reviews")
    .select(
      "id,public_id,profile_id,igdb_id,game_slug,rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,comments_scope,created_at,updated_at,journey_id,journeys!reviews_journey_id_fkey(title),profiles!reviews_profile_id_fkey(username,display_name,avatar_url,verified)",
    )
    .order(options.order === "rating" ? "rating" : "created_at", {
      ascending: oldestFirst,
      nullsFirst: false,
    })
    .limit(limit);
  let diaryQuery = supabase
    .from("diary_entries")
    .select(
      "id,public_id,profile_id,igdb_id,game_slug,played_on,ended_on,minutes,note,marks_start,marks_finish,contains_spoilers,visibility,comments_scope,created_at,updated_at,journey_id,journeys!diary_entries_journey_id_fkey(title),profiles!diary_entries_profile_id_fkey(username,display_name,avatar_url,verified)",
    )
    .order("created_at", { ascending: oldestFirst })
    .limit(limit);
  let screenshotsQuery = supabase
    .from("screenshots")
    .select(
      "id,public_id,profile_id,igdb_id,game_slug,storage_path,description,contains_spoilers,visibility,comments_scope,width,height,created_at,updated_at,profiles!screenshots_profile_id_fkey(username,display_name,avatar_url,verified)",
    )
    .order("created_at", { ascending: oldestFirst })
    .limit(limit);
  if (options.profileId) {
    reviewsQuery = reviewsQuery.eq("profile_id", options.profileId);
    diaryQuery = diaryQuery.eq("profile_id", options.profileId);
    screenshotsQuery = screenshotsQuery.eq("profile_id", options.profileId);
  }
  if (options.profileIds) {
    reviewsQuery = reviewsQuery.in("profile_id", options.profileIds);
    diaryQuery = diaryQuery.in("profile_id", options.profileIds);
    screenshotsQuery = screenshotsQuery.in("profile_id", options.profileIds);
  }
  if (options.gameId) {
    reviewsQuery = reviewsQuery.eq("igdb_id", options.gameId);
    diaryQuery = diaryQuery.eq("igdb_id", options.gameId);
    screenshotsQuery = screenshotsQuery.eq("igdb_id", options.gameId);
  }
  if (searchPattern) {
    let journeyQuery = supabase
      .from("journeys")
      .select("id")
      .ilike("title", `%${searchPattern}%`)
      .limit(200);
    if (options.profileId)
      journeyQuery = journeyQuery.eq("profile_id", options.profileId);
    if (options.profileIds)
      journeyQuery = journeyQuery.in("profile_id", options.profileIds);
    if (options.gameId)
      journeyQuery = journeyQuery.eq("igdb_id", options.gameId);
    const { data: matchingJourneys } = await journeyQuery;
    const matchingJourneyIds = (matchingJourneys ?? []).map((row) => row.id);
    const reviewSearch = [
      `game_slug.ilike.%${searchPattern}%`,
      `title.ilike.%${searchPattern}%`,
      `content.ilike.%${searchPattern}%`,
      `platform.ilike.%${searchPattern}%`,
    ];
    const diarySearch = [
      `game_slug.ilike.%${searchPattern}%`,
      `note.ilike.%${searchPattern}%`,
    ];
    if (matchingJourneyIds.length) {
      const journeyFilter = `journey_id.in.(${matchingJourneyIds.join(",")})`;
      reviewSearch.push(journeyFilter);
      diarySearch.push(journeyFilter);
    }
    reviewsQuery = reviewsQuery.or(reviewSearch.join(","));
    diaryQuery = diaryQuery.or(diarySearch.join(","));
    screenshotsQuery = screenshotsQuery.or(
      [
        `game_slug.ilike.%${searchPattern}%`,
        `description.ilike.%${searchPattern}%`,
      ].join(","),
    );
  }
  if (options.rating === "rated")
    reviewsQuery = reviewsQuery.not("rating", "is", null);
  else if (options.rating === "great")
    reviewsQuery = reviewsQuery.gte("rating", 80);
  else if (options.rating === "positive")
    reviewsQuery = reviewsQuery.gte("rating", 60).lt("rating", 80);
  else if (options.rating === "mixed")
    reviewsQuery = reviewsQuery.gte("rating", 40).lt("rating", 60);
  else if (options.rating === "low")
    reviewsQuery = reviewsQuery.lt("rating", 40);
  else if (options.rating === "unrated")
    reviewsQuery = reviewsQuery.is("rating", null);
  if (options.spoilers === "hide") {
    reviewsQuery = reviewsQuery.eq("contains_spoilers", false);
    diaryQuery = diaryQuery.eq("contains_spoilers", false);
    screenshotsQuery = screenshotsQuery.eq("contains_spoilers", false);
  } else if (options.spoilers === "only") {
    reviewsQuery = reviewsQuery.eq("contains_spoilers", true);
    diaryQuery = diaryQuery.eq("contains_spoilers", true);
    screenshotsQuery = screenshotsQuery.eq("contains_spoilers", true);
  }
  if (options.before) {
    const cursorOperator = oldestFirst ? "gt" : "lt";
    reviewsQuery = reviewsQuery[cursorOperator]("created_at", options.before);
    diaryQuery = diaryQuery[cursorOperator]("created_at", options.before);
    screenshotsQuery = screenshotsQuery[cursorOperator](
      "created_at",
      options.before,
    );
  }
  const [{ data: reviews }, { data: diary }, { data: screenshots }] =
    await Promise.all([
      includeReviews ? reviewsQuery : Promise.resolve({ data: [] }),
      includeDiary ? diaryQuery : Promise.resolve({ data: [] }),
      includeScreenshots ? screenshotsQuery : Promise.resolve({ data: [] }),
    ]);
  const rows = [
    ...(reviews ?? []),
    ...(diary ?? []),
    ...(screenshots ?? []),
  ] as unknown as (Row & Record<string, unknown>)[];
  const journeyIds = [
    ...new Set(
      [...(reviews ?? []), ...(diary ?? [])]
        .map((row) => row.journey_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const reviewIds = (reviews ?? []).map((row) => row.id);
  const diaryIds = (diary ?? []).map((row) => row.id);
  const screenshotIds = (screenshots ?? []).map((row) => row.id);
  const [
    { data: journeySessionRows },
    games,
    viewerId,
    viewerPreference,
    reviewLikes,
    diaryLikes,
    screenshotLikes,
    signedScreenshots,
  ] = await Promise.all([
    journeyIds.length
      ? supabase
          .from("diary_entries")
          .select(
            "id,journey_id,played_on,ended_on,minutes,note,marks_start,marks_finish",
          )
          .in("journey_id", journeyIds)
          .order("played_on", { ascending: true })
      : Promise.resolve({ data: [] }),
    getGamesByIds(rows.map((row) => row.igdb_id)),
    viewerIdPromise,
    viewerPreferencePromise,
    reviewIds.length
      ? supabase.rpc("get_content_likes", {
          target_type: "review",
          target_ids: reviewIds,
        })
      : Promise.resolve({ data: [] }),
    diaryIds.length
      ? supabase.rpc("get_content_likes", {
          target_type: "diary",
          target_ids: diaryIds,
        })
      : Promise.resolve({ data: [] }),
    screenshotIds.length
      ? supabase.rpc("get_content_likes", {
          target_type: "screenshot",
          target_ids: screenshotIds,
        })
      : Promise.resolve({ data: [] }),
    screenshots?.length
      ? supabase.storage.from("screenshots").createSignedUrls(
          screenshots.map((item) => item.storage_path),
          3600,
        )
      : Promise.resolve({ data: [] }),
  ]);
  const sessionsByJourney = new Map<string, SocialEntry["journeySessions"]>();
  for (const session of journeySessionRows ?? []) {
    if (!session.journey_id) continue;
    const current = sessionsByJourney.get(session.journey_id) ?? [];
    current.push({
      id: session.id,
      playedOn: session.played_on,
      endedOn: session.ended_on,
      minutes: session.minutes,
      note: session.note,
      marksStart: session.marks_start,
      marksFinish: session.marks_finish,
    });
    sessionsByJourney.set(session.journey_id, current);
  }
  const coverProfileIds =
    viewerPreference?.custom_cover_scope === "EVERYONE"
      ? [...new Set(rows.map((row) => row.profile_id))]
      : viewerId
        ? [viewerId]
        : [];
  const { data: covers } =
    coverProfileIds.length && games.length
      ? await supabase
          .from("user_games")
          .select("profile_id,igdb_id,custom_cover_url")
          .in("profile_id", coverProfileIds)
          .in(
            "igdb_id",
            games.map((game) => game.id),
          )
      : { data: [] };
  const coversByOwnerAndGame = new Map(
    (covers ?? []).map((cover) => [
      `${cover.profile_id}:${cover.igdb_id}`,
      cover.custom_cover_url,
    ]),
  );
  const baseGamesById = new Map(games.map((game) => [game.id, game]));
  const screenshotUrlByPath = new Map(
    (signedScreenshots.data ?? []).map((item) => [item.path, item.signedUrl]),
  );
  const likesById = new Map(
    [
      ...(reviewLikes.data ?? []),
      ...(diaryLikes.data ?? []),
      ...(screenshotLikes.data ?? []),
    ].map(
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
      const screenshot = "storage_path" in row;
      const review = !screenshot && "rating" in row;
      return [
        {
          id: row.id,
          publicId: row.public_id,
          kind: screenshot ? "screenshot" : review ? "review" : "diary",
          profileId: row.profile_id,
          profile,
          igdbId: row.igdb_id,
          gameSlug: row.game_slug,
          game: (() => {
            const game = baseGamesById.get(row.igdb_id);
            if (!game) return null;
            const coverOwner =
              viewerPreference?.custom_cover_scope === "EVERYONE"
                ? row.profile_id
                : viewerId;
            return {
              ...game,
              coverUrl: resolveGameCover(
                game.coverUrl,
                coverOwner
                  ? coversByOwnerAndGame.get(`${coverOwner}:${row.igdb_id}`)
                  : null,
              ),
            };
          })(),
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
          startedOn: review ? String(row.started_on ?? "") || null : undefined,
          finishedOn: review
            ? String(row.finished_on ?? "") || null
            : undefined,
          content:
            String(
              (screenshot
                ? row.description
                : review
                  ? row.content
                  : row.note) ?? "",
            ) || null,
          imageUrl: screenshot
            ? (screenshotUrlByPath.get(String(row.storage_path)) ?? undefined)
            : undefined,
          imageWidth: screenshot ? Number(row.width) : undefined,
          imageHeight: screenshot ? Number(row.height) : undefined,
          playedOn: review || screenshot ? undefined : String(row.played_on),
          endedOn:
            review || screenshot
              ? undefined
              : String(row.ended_on ?? "") || null,
          minutes:
            review || screenshot ? undefined : (row.minutes as number | null),
          marksStart:
            review || screenshot ? undefined : Boolean(row.marks_start),
          marksFinish:
            review || screenshot ? undefined : Boolean(row.marks_finish),
          journeyId: String(row.journey_id ?? "") || null,
          journeyTitle: journeyTitleOf(row.journeys) || null,
          journeySessions: screenshot
            ? undefined
            : (sessionsByJourney.get(String(row.journey_id)) ?? []),
          spoilers: Boolean(row.contains_spoilers),
          visibility: row.visibility as SocialEntry["visibility"],
          commentsScope: row.comments_scope as SocialEntry["commentsScope"],
          createdAt: row.created_at,
          updatedAt: String(row.updated_at ?? "") || undefined,
          likes: Number(likesById.get(row.id)?.like_count ?? 0),
          likedByViewer: Boolean(likesById.get(row.id)?.liked_by_viewer),
        },
      ];
    })
    .sort((a, b) => {
      if (options.order === "rating")
        return (
          (b.rating ?? -1) - (a.rating ?? -1) ||
          b.createdAt.localeCompare(a.createdAt)
        );
      return oldestFirst
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);
}

/** Ids the viewer follows. The feed needs them; RLS handles the rest. */
export async function getFollowingIds(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .limit(1000);
  return (data ?? []).map((row) => String(row.following_id));
}

export type SuggestedProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  reviewCount: number;
};

/**
 * People worth following, for a feed that would otherwise be empty. Ranked by
 * how much they have written, since an account with reviews is what makes a
 * feed worth having. Excludes the viewer and anyone already followed; blocks
 * and suspensions are filtered by the database.
 */
export async function getSuggestedProfiles(
  supabase: SupabaseClient,
  viewerId: string,
  options: { exclude?: string[]; limit?: number } = {},
): Promise<SuggestedProfile[]> {
  const limit = options.limit ?? 8;
  const skip = new Set([viewerId, ...(options.exclude ?? [])]);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,verified")
    .not("username", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);

  const candidates = (profiles ?? []).filter((row) => !skip.has(row.id));
  if (!candidates.length) return [];

  const { data: reviews } = await supabase
    .from("reviews")
    .select("profile_id")
    .in(
      "profile_id",
      candidates.map((row) => row.id),
    )
    .limit(1000);

  const counts = new Map<string, number>();
  for (const row of reviews ?? []) {
    const id = String(row.profile_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return candidates
    .map((row) => ({
      id: row.id,
      username: String(row.username),
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      verified: Boolean(row.verified),
      reviewCount: counts.get(row.id) ?? 0,
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, limit);
}
