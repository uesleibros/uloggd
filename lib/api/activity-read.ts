import "server-only";
import type { PoolClient } from "pg";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import type { JournalImage } from "@/lib/journal-images";
import type { ActivityOptions } from "@/lib/activity-types";
import { profileOf } from "@/lib/profile-join";
import type { SocialEntry } from "@/components/social/activity-stream";
import { activityRows, type ActivityRow } from "./activity-query";
import { series } from "./series";

export async function readActivity(
  client: PoolClient,
  viewerId: string | null,
  options: ActivityOptions,
) {
  const limit = options.limit ?? 30;
  const kinds = options.kinds ?? ["review", "diary", "screenshot"];
  const oldestFirst = options.order === "oldest";
  // One kind at a time. These share the caller's client, so a `Promise.all`
  // here queued them inside the driver anyway and warned about it on every
  // feed render, which is every home page.
  const sets: Awaited<ReturnType<typeof activityRows>>[] = [];
  for (const kind of kinds)
    sets.push(await activityRows(client, kind, options));
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
  const kindOf = (row: ActivityRow) =>
    "image_url" in row ? "screenshot" : "rating" in row ? "review" : "diary";
  const diaryIds = rows
    .filter((row) => kindOf(row) === "diary")
    .map((row) => row.id);

  // Everything the entries need beyond themselves, in one round trip: the
  // viewer's cover preference, the custom covers it allows, the journal
  // pictures, and likes and comments for every kind. These were up to ten
  // queries in a row on one connection, and with the database 55ms away the
  // feed on the home page spent half a second just waiting on them.
  const args: unknown[] = [
    viewerId,
    [...new Set(rows.map((row) => row.profile_id))],
    rows.map((row) => row.igdb_id),
    diaryIds,
  ];
  const param = (value: unknown) => {
    args.push(value);
    return `$${args.length}`;
  };
  const likeParts: string[] = [];
  const commentParts: string[] = [];
  for (const kind of kinds) {
    const ids = rows.filter((row) => kindOf(row) === kind).map((row) => row.id);
    if (!ids.length) continue;
    const type = param(kind);
    const targets = param(ids);
    likeParts.push(
      `select * from public.get_content_likes(target_type => ${type},target_ids => ${targets}::uuid[])`,
    );
    commentParts.push(
      `select * from public.get_content_comment_counts(target_type => ${type},target_ids => ${targets}::uuid[])`,
    );
  }
  const union = (parts: string[], none: string) =>
    parts.length ? parts.join(" union all ") : none;
  const [extras, games] = await series(
    () =>
      client.query<{
        custom_cover_scope: string | null;
        covers: {
          profile_id: string;
          igdb_id: number;
          custom_cover_url: string | null;
        }[];
        images: {
          id: string;
          entry_id: string;
          image_url: string;
          width: number;
          height: number;
          caption: string | null;
        }[];
        likes: {
          content_id: string;
          like_count: number;
          liked_by_viewer: boolean;
        }[];
        comments: { content_id: string; comment_count: number }[];
      }>(
        `with preference as (
          select custom_cover_scope from public.profiles where id = $1
        )
        select
          (select custom_cover_scope from preference) as custom_cover_scope,
          coalesce((select jsonb_agg(owned) from (
            select profile_id,igdb_id,custom_cover_url from public.user_games
            where igdb_id = any($3::bigint[]) and profile_id = any(
              case
                when (select custom_cover_scope from preference) = 'EVERYONE' then $2::uuid[]
                when $1::uuid is null then '{}'::uuid[]
                else array[$1::uuid]
              end
            )
          ) owned), '[]'::jsonb) as covers,
          coalesce((select jsonb_agg(picture order by picture.position) from (
            select id,entry_id,image_url,width,height,caption,position
            from public.diary_entry_images where entry_id = any($4::uuid[])
          ) picture), '[]'::jsonb) as images,
          coalesce((select jsonb_agg(liked) from (${union(
            likeParts,
            "select null::uuid as content_id, 0::bigint as like_count, false as liked_by_viewer where false",
          )}) liked), '[]'::jsonb) as likes,
          coalesce((select jsonb_agg(counted) from (${union(
            commentParts,
            "select null::uuid as content_id, 0::bigint as comment_count where false",
          )}) counted), '[]'::jsonb) as comments`,
        args,
      ),
    () => getGamesByIds([...new Set(rows.map((row) => row.igdb_id))]),
  );
  const { custom_cover_scope, covers, images } = extras.rows[0];
  const viewerPreference = custom_cover_scope ? { custom_cover_scope } : null;
  const interactions = [
    { likes: extras.rows[0].likes, comments: extras.rows[0].comments },
  ];
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
