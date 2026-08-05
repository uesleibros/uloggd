import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds } from "@/lib/igdb";
import { getAuthUser } from "@/lib/supabase/auth";
import { resolveGameCover } from "@/lib/game-cover";
import { getJournalImages } from "@/lib/journal-images";
import { profileOf, type ProfileJoin } from "@/lib/profile-join";
import { pickFriendsPlaying, type FriendPlaying } from "@/lib/friends-playing";
import type { SocialEntry } from "@/components/social/activity-stream";

type Row = {
  id: string;
  public_id?: string;
  profile_id: string;
  igdb_id: number;
  game_slug: string;
  created_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
};
function journeyOf(value: unknown): { title: string; publicId: string } | null {
  const joined = Array.isArray(value) ? value[0] : value;
  if (joined && typeof joined === "object" && "title" in joined) {
    const journey = joined as { title?: unknown; public_id?: unknown };
    const title = String(journey.title ?? "");
    const publicId = String(journey.public_id ?? "");
    if (title && publicId) return { title, publicId };
  }
  return null;
}

/**
 * The `or` filter that decides whether a review matches a search term.
 *
 * Exported because two callers need it and they must not drift: the browse
 * page counts the matches to work out how many pages there are, and this
 * module fetches the page itself. A count built from a slightly different
 * filter produces a last page that is empty, which looks like a bug in the
 * pager rather than a disagreement between two copies of one rule.
 *
 * Journey titles are part of it, and they cost a query, so the ids are passed
 * in rather than looked up here.
 */
export function reviewSearchFilter(
  pattern: string,
  journeyIds: string[] = [],
): string {
  const parts = [
    `game_slug.ilike.%${pattern}%`,
    `title.ilike.%${pattern}%`,
    `content.ilike.%${pattern}%`,
    `platform.ilike.%${pattern}%`,
  ];
  if (journeyIds.length) parts.push(`journey_id.in.(${journeyIds.join(",")})`);
  return parts.join(",");
}

/** The term as the filters see it: words joined so gaps match anything. */
export function searchPatternOf(search: string | undefined): string {
  return (
    search
      ?.trim()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .slice(0, 12)
      .join("%") ?? ""
  );
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
    /**
     * Skip this many rows, for numbered pages.
     *
     * Only honoured when exactly one kind is asked for. The three sources are
     * queried separately and merged in memory, so an offset applied to each
     * of them would skip a different slice of each and the merge would return
     * rows that belong to no page at all. One kind, one query, no merge.
     */
    offset?: number;
  } = {},
) {
  // An empty author list means "nobody I follow", which is not the same as
  // "no filter", without this the feed would show the whole platform.
  if (options.profileIds && !options.profileIds.length) return [];
  const limit = options.limit ?? 30;
  const includeReviews = !options.kinds || options.kinds.includes("review");
  const includeDiary = !options.kinds || options.kinds.includes("diary");
  const includeScreenshots =
    !options.kinds || options.kinds.includes("screenshot");
  const oldestFirst = options.order === "oldest";
  const singleKind = options.kinds?.length === 1;
  const offset = singleKind ? (options.offset ?? 0) : 0;
  if (options.offset && !singleKind)
    throw new Error("getActivity: offset needs exactly one kind");
  const searchPattern = searchPatternOf(options.search);
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
      "id,public_id,profile_id,igdb_id,game_slug,rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,comments_scope,created_at,updated_at,journey_id,journeys!reviews_journey_id_fkey(title,public_id),profiles!reviews_profile_id_fkey(username,display_name,avatar_url,verified,account_type)",
    )
    .order(options.order === "rating" ? "rating" : "created_at", {
      ascending: oldestFirst,
      nullsFirst: false,
    })
    .limit(limit);
  let diaryQuery = supabase
    .from("diary_entries")
    .select(
      "id,public_id,profile_id,igdb_id,game_slug,played_on,ended_on,started_at,minutes,note,marks_start,marks_finish,contains_spoilers,sensitive,visibility,comments_scope,created_at,updated_at,journey_id,journeys!diary_entries_journey_id_fkey(title,public_id),profiles!diary_entries_profile_id_fkey(username,display_name,avatar_url,verified,account_type)",
    )
    .order("created_at", { ascending: oldestFirst })
    .limit(limit);
  let screenshotsQuery = supabase
    .from("screenshots")
    .select(
      "id,public_id,profile_id,igdb_id,game_slug,image_url,description,contains_spoilers,sensitive,visibility,comments_scope,width,height,created_at,updated_at,profiles!screenshots_profile_id_fkey(username,display_name,avatar_url,verified,account_type)",
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
    const diarySearch = [
      `game_slug.ilike.%${searchPattern}%`,
      `note.ilike.%${searchPattern}%`,
    ];
    if (matchingJourneyIds.length) {
      diarySearch.push(`journey_id.in.(${matchingJourneyIds.join(",")})`);
    }
    reviewsQuery = reviewsQuery.or(
      reviewSearchFilter(searchPattern, matchingJourneyIds),
    );
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
  if (offset) {
    reviewsQuery = reviewsQuery.range(offset, offset + limit - 1);
    diaryQuery = diaryQuery.range(offset, offset + limit - 1);
    screenshotsQuery = screenshotsQuery.range(offset, offset + limit - 1);
  }
  const [{ data: reviews }, { data: diary }, { data: screenshots }] =
    await Promise.all([
      includeReviews ? reviewsQuery : Promise.resolve({ data: [] }),
      includeDiary ? diaryQuery : Promise.resolve({ data: [] }),
      includeScreenshots ? screenshotsQuery : Promise.resolve({ data: [] }),
    ]);
  const rows = (
    [
      ...(reviews ?? []),
      ...(diary ?? []),
      ...(screenshots ?? []),
    ] as unknown as (Row & Record<string, unknown>)[]
  )
    .sort((a, b) => {
      if (options.order === "rating") {
        const aRating = typeof a.rating === "number" ? a.rating : -1;
        const bRating = typeof b.rating === "number" ? b.rating : -1;
        return bRating - aRating || b.created_at.localeCompare(a.created_at);
      }
      return oldestFirst
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit);
  // Hydrate only the rows that can actually reach the response. Each source
  // query deliberately overfetches up to `limit` so the global merge is
  // correct, but IGDB, likes, journeys and signed media must not repeat that
  // overfetch.
  // `image_url` is what marks a screenshot apart from a review or a diary
  // entry here. It used to be `storage_path`, and when that column was dropped
  // this quietly began classifying every screenshot as a diary entry: the rows
  // still arrived, they were simply rendered as the wrong kind of post.
  const selectedReviews = rows.filter(
    (row) => !("image_url" in row) && "rating" in row,
  );
  const selectedDiary = rows.filter(
    (row) => !("image_url" in row) && !("rating" in row),
  );
  const selectedScreenshots = rows.filter((row) => "image_url" in row);
  const reviewIds = selectedReviews.map((row) => row.id);
  const diaryIds = selectedDiary.map((row) => row.id);
  const screenshotIds = selectedScreenshots.map((row) => row.id);
  const rowGameIds = [...new Set(rows.map((row) => row.igdb_id))];
  /**
   * The custom covers, fetched alongside the likes rather than after them.
   *
   * It used to wait for IGDB to answer so it could filter by the games that
   * came back, which made it a third round trip on a feed that already needed
   * two. The ids on the rows are a superset of those, and a cover for a game
   * IGDB did not return is simply never looked up, so the narrower filter was
   * buying nothing and costing a trip on every feed on the site.
   */
  const coversPromise = (async () => {
    const [id, preference] = await Promise.all([
      viewerIdPromise,
      viewerPreferencePromise,
    ]);
    const owners =
      preference?.custom_cover_scope === "EVERYONE"
        ? [...new Set(rows.map((row) => row.profile_id))]
        : id
          ? [id]
          : [];
    if (!owners.length || !rowGameIds.length) return { data: [] };
    return supabase
      .from("user_games")
      .select("profile_id,igdb_id,custom_cover_url")
      .in("profile_id", owners)
      .in("igdb_id", rowGameIds);
  })();
  const [
    games,
    viewerId,
    viewerPreference,
    reviewLikes,
    diaryLikes,
    screenshotLikes,
    journalImages,
    { data: covers },
  ] = await Promise.all([
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
    getJournalImages(supabase, diaryIds),
    coversPromise,
  ]);
  const coversByOwnerAndGame = new Map(
    (covers ?? []).map((cover) => [
      `${cover.profile_id}:${cover.igdb_id}`,
      cover.custom_cover_url,
    ]),
  );
  const baseGamesById = new Map(games.map((game) => [game.id, game]));
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
      const screenshot = "image_url" in row;
      const review = !screenshot && "rating" in row;
      const journey = journeyOf(row.journeys);
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
            ? ((row.image_url as string | null) ?? undefined)
            : undefined,
          imageWidth: screenshot ? Number(row.width) : undefined,
          imageHeight: screenshot ? Number(row.height) : undefined,
          images: review || screenshot ? undefined : journalImages.get(row.id),
          playedOn: review || screenshot ? undefined : String(row.played_on),
          startedAt:
            review || screenshot
              ? undefined
              : String(row.started_at ?? "") || null,
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
          journeyTitle: journey?.title ?? null,
          journeyPublicId: journey?.publicId ?? null,
          spoilers: Boolean(row.contains_spoilers),
          sensitive: Boolean(row.sensitive),
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

/** Ids the viewer follows for relationship-aware Home and profile surfaces. */
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

export type { FriendPlaying };

/** A small, real-time shelf for Home. RLS still decides whose library is visible. */
export async function getFriendsPlaying(
  supabase: SupabaseClient,
  profileIds: string[],
  limit = 10,
): Promise<FriendPlaying[]> {
  if (!profileIds.length) return [];

  const { data: rows } = await supabase
    .from("user_games")
    .select(
      "profile_id,igdb_id,updated_at,profiles!user_games_profile_id_fkey(username,display_name,avatar_url,verified)",
    )
    .in("profile_id", profileIds)
    .eq("status", "PLAYING")
    .order("updated_at", { ascending: false })
    // Room to spare, because rows collapse now: a circle of friends playing
    // the same three games would otherwise leave the shelf nearly empty after
    // the duplicates are dropped.
    .limit(Math.min(Math.max(limit * 4, limit), 40));

  if (!rows?.length) return [];
  const gameIds = [...new Set(rows.map((row) => Number(row.igdb_id)))];
  const games = await getGamesByIds(gameIds);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  return pickFriendsPlaying(rows, gamesById, limit);
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
