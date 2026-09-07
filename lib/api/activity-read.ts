import "server-only";
import type { PoolClient } from "pg";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import type { JournalImage } from "@/lib/journal-images";
import type { ActivityOptions } from "@/lib/activity-types";
import { profileOf } from "@/lib/profile-join";
import type { SocialEntry } from "@/components/social/activity-stream";
import { activityRows, type ActivityRow } from "./activity-query";

export async function readActivity(
  client: PoolClient,
  viewerId: string | null,
  options: ActivityOptions,
) {
  const limit = options.limit ?? 30;
  const kinds = options.kinds ?? ["review", "diary", "screenshot"];
  const oldestFirst = options.order === "oldest";
  const sets = await Promise.all(
    kinds.map((kind) => activityRows(client, kind, options)),
  );
  const rows = sets
    .flat()
    .sort((a, b) => {
      if (options.order === "rating")
        return (
          Number(b.rating ?? -1) - Number(a.rating ?? -1) ||
          b.created_at.localeCompare(a.created_at)
        );
      return oldestFirst
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit)
    .map((row) => JSON.parse(JSON.stringify(row)) as ActivityRow);
  if (!rows.length) return [];
  const [{ rows: preferences }, games] = await Promise.all([
    client.query<{ custom_cover_scope: string }>(
      "select custom_cover_scope from public.profiles where id = $1",
      [viewerId],
    ),
    getGamesByIds([...new Set(rows.map((row) => row.igdb_id))]),
  ]);
  const viewerPreference = preferences[0];
  const owners =
    viewerPreference?.custom_cover_scope === "EVERYONE"
      ? [...new Set(rows.map((row) => row.profile_id))]
      : viewerId
        ? [viewerId]
        : [];
  const kindOf = (row: ActivityRow) =>
    "image_url" in row ? "screenshot" : "rating" in row ? "review" : "diary";
  const diaryIds = rows
    .filter((row) => kindOf(row) === "diary")
    .map((row) => row.id);
  const [{ rows: covers }, { rows: images }, interactions] = await Promise.all([
    client.query<{
      profile_id: string;
      igdb_id: number;
      custom_cover_url: string | null;
    }>(
      "select profile_id,igdb_id,custom_cover_url from public.user_games where profile_id = any($1::uuid[]) and igdb_id = any($2::bigint[])",
      [owners, rows.map((row) => row.igdb_id)],
    ),
    client.query<{
      id: string;
      entry_id: string;
      image_url: string;
      width: number;
      height: number;
      caption: string | null;
    }>(
      "select id,entry_id,image_url,width,height,caption from public.diary_entry_images where entry_id = any($1::uuid[]) order by position",
      [diaryIds],
    ),
    Promise.all(
      kinds.map(async (kind) => {
        const ids = rows
          .filter((row) => kindOf(row) === kind)
          .map((row) => row.id);
        if (!ids.length) return { likes: [], comments: [] };
        const [likes, comments] = await Promise.all([
          client.query<{
            content_id: string;
            like_count: number;
            liked_by_viewer: boolean;
          }>(
            "select * from public.get_content_likes(target_type => $1,target_ids => $2::uuid[])",
            [kind, ids],
          ),
          client.query<{ content_id: string; comment_count: number }>(
            "select * from public.get_content_comment_counts(target_type => $1,target_ids => $2::uuid[])",
            [kind, ids],
          ),
        ]);
        return { likes: likes.rows, comments: comments.rows };
      }),
    ),
  ]);
  const journalImages = new Map<string, JournalImage[]>();
  for (const image of images) {
    const list = journalImages.get(image.entry_id) ?? [];
    list.push({
      id: image.id,
      url: image.image_url,
      width: image.width,
      height: image.height,
      caption: image.caption,
    });
    journalImages.set(image.entry_id, list);
  }
  const coversByOwnerAndGame = new Map(
    covers.map((cover) => [
      `${cover.profile_id}:${cover.igdb_id}`,
      cover.custom_cover_url,
    ]),
  );
  const baseGamesById = new Map(games.map((game) => [game.id, game]));
  const likesById = new Map(
    interactions
      .flatMap((one) => one.likes)
      .map((row) => [row.content_id, row]),
  );
  const commentsById = new Map(
    interactions
      .flatMap((one) => one.comments)
      .map((row) => [row.content_id, Number(row.comment_count)]),
  );
  return rows.flatMap((row): SocialEntry[] => {
    const profile = profileOf(row.profiles);
    if (!profile?.username) return [];
    const kind = kindOf(row);
    const screenshot = kind === "screenshot";
    const review = kind === "review";
    const journey = row.journeys as
      { title?: string; public_id?: string } | undefined;
    const originalGame = baseGamesById.get(row.igdb_id);
    const coverOwner =
      viewerPreference?.custom_cover_scope === "EVERYONE"
        ? row.profile_id
        : viewerId;
    return [
      {
        id: row.id,
        publicId: row.public_id,
        kind,
        profileId: row.profile_id,
        profile,
        igdbId: row.igdb_id,
        gameSlug: row.game_slug,
        game: originalGame
          ? {
              ...originalGame,
              coverUrl: resolveGameCover(
                originalGame.coverUrl,
                coverOwner
                  ? coversByOwnerAndGame.get(`${coverOwner}:${row.igdb_id}`)
                  : null,
              ),
            }
          : null,
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
        finishedOn: review ? String(row.finished_on ?? "") || null : undefined,
        content:
          String(
            (screenshot ? row.description : review ? row.content : row.note) ??
              "",
          ) || null,
        imageUrl: screenshot
          ? (row.image_url as string | undefined)
          : undefined,
        imageWidth: screenshot ? Number(row.width) : undefined,
        imageHeight: screenshot ? Number(row.height) : undefined,
        images: kind === "diary" ? journalImages.get(row.id) : undefined,
        playedOn: kind === "diary" ? String(row.played_on) : undefined,
        startedAt:
          kind === "diary" ? String(row.started_at ?? "") || null : undefined,
        endedOn:
          kind === "diary" ? String(row.ended_on ?? "") || null : undefined,
        minutes: kind === "diary" ? (row.minutes as number | null) : undefined,
        marksStart: kind === "diary" ? Boolean(row.marks_start) : undefined,
        marksFinish: kind === "diary" ? Boolean(row.marks_finish) : undefined,
        journeyId: String(row.journey_id ?? "") || null,
        journeyTitle: journey?.title ?? null,
        journeyPublicId: journey?.public_id ?? null,
        spoilers: Boolean(row.contains_spoilers),
        sensitive: Boolean(row.sensitive),
        visibility: row.visibility as SocialEntry["visibility"],
        commentsScope: row.comments_scope as SocialEntry["commentsScope"],
        createdAt: row.created_at,
        updatedAt: String(row.updated_at ?? "") || undefined,
        likes: Number(likesById.get(row.id)?.like_count ?? 0),
        likedByViewer: Boolean(likesById.get(row.id)?.liked_by_viewer),
        comments: commentsById.get(row.id) ?? 0,
      },
    ];
  });
}
