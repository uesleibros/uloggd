import { readContent } from "@/lib/api/content-read";
import { readJournalImages } from "@/lib/api/journal-image-read";
import { segmentBefore, LIST_ID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import type { JourneyRecord, JourneySessions } from "@/lib/content-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "journal.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 1000)
      throw new ApiFailure(
        "invalid_request",
        "page must be between 1 and 1000.",
      );
    return db(async (client) => {
      const journey = await readContent<JourneyRecord>(
        client,
        "journey",
        segmentBefore(request, 1, "journey id", LIST_ID),
      );
      // The compact summary spans the journey; only this page gets full text and images.
      const { rows } = await client.query<Omit<JourneySessions, "images">>(
        `select
      coalesce((select jsonb_agg(s order by s.played_on,s.started_at nulls last,s.created_at,s.id) from (
        select id,public_id,profile_id,igdb_id,game_slug,played_on,ended_on,started_at,minutes,note,marks_start,marks_finish,contains_spoilers,sensitive,visibility,comments_scope,created_at,updated_at,journey_id
        from public.diary_entries where journey_id=$1 order by played_on,started_at nulls last,created_at,id limit 40 offset $2
      ) s),'[]'::jsonb) as data,
      coalesce((select jsonb_agg(s order by s.played_on) from (
        select played_on,ended_on,minutes,visibility,updated_at from public.diary_entries where journey_id=$1
      ) s),'[]'::jsonb) as summary,
      coalesce((select jsonb_agg(r order by r.created_at desc) from (
        select public_id,title,rating,rating_mode,recommended,created_at from public.reviews where journey_id=$1 order by created_at desc limit 3
      ) r),'[]'::jsonb) as reviews`,
        [journey.id, (page - 1) * 40],
      );
      const result = rows[0];
      const images = await readJournalImages(
        client,
        result.data.map((entry) => entry.id),
      );
      return { ...result, images };
    });
  },
});
