import {
  jsonBody,
  optionalUuid,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar of days, rather than a session each.
 *
 * The journal's calendar marks a game as played on a day without saying
 * anything else about it, and a drag across a week is one gesture. Sending it
 * as one call is not only cheaper: the database decides day by day which ones
 * are already covered by an existing session, so a range that overlaps one
 * cannot half-apply the way a loop of single writes would.
 */
function days(value: unknown, where: string) {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (
    !list ||
    list.length === 0 ||
    list.length > 366 ||
    list.some((one) => typeof one !== "string" || !DAY.test(one))
  )
    throw new ApiFailure(
      "invalid_request",
      `${where} must be 1 to 366 dates as YYYY-MM-DD.`,
    );
  return list as string[];
}

export const PUT = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const journey = optionalUuid(body, "journey_id");
    const wanted = days(body.days, "days");

    const added = await db(async (client) => {
      const { rows } = await client.query<{ added: number }>(
        `select public.bulk_save_diary_days(
           game_id => $1, game_slug => $2, days => $3::date[],
           entry_journey => $4) as added`,
        [gameId, slug, wanted, journey],
      );
      return rows[0]?.added ?? 0;
    });

    // Days already covered by a session are left alone rather than refused,
    // so the count is what changed and not what was asked for.
    return { data: { igdb_id: gameId, days: wanted, added } };
  },
});

export const DELETE = apiRoute({
  scope: "journal.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const url = new URL(request.url);
    const raw = url.searchParams.get("igdb_id") ?? "";
    if (!/^\d{1,12}$/.test(raw))
      throw new ApiFailure("invalid_request", "igdb_id must be a game id.");
    const gameId = Number(raw);
    const journey = optionalUuid(
      { journey_id: url.searchParams.get("journey_id") ?? undefined },
      "journey_id",
    );
    const wanted = days(url.searchParams.get("days"), "days");

    const removed = await db(async (client) => {
      const { rows } = await client.query<{ removed: number }>(
        `select public.bulk_delete_diary_days(
           game_id => $1, days => $2::date[], entry_journey => $3) as removed`,
        [gameId, wanted, journey],
      );
      return rows[0]?.removed ?? 0;
    });

    return { data: { igdb_id: gameId, days: wanted, removed } };
  },
});
