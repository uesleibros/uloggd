import { ApiFailure, apiRoute } from "@/lib/api/route";
import { activityInput } from "@/lib/api/activity-input";
import { readActivity } from "@/lib/api/activity-read";
import { getGameBySlug } from "@/lib/igdb";
import { segmentBefore } from "@/lib/api/path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const game = await getGameBySlug(
      segmentBefore(request, 1, "game slug", /^[a-z0-9-]{1,200}$/),
    );
    if (!game) throw new ApiFailure("not_found", "No game with that slug.");
    const options = activityInput(request);
    return db(async (client) => {
      const [data, stats] = await Promise.all([
        readActivity(client, identity?.profileId ?? null, {
          ...options,
          gameId: game.id,
        }),
        client.query(
          `select count(*)::int as sessions,coalesce(sum(minutes),0) as minutes,
          coalesce(sum(greatest(1,coalesce(ended_on-played_on+1,1))),0) as days
          from public.diary_entries where igdb_id=$1 and ($2::uuid is null or profile_id=$2)
            and ($3::uuid[] is null or profile_id=any($3))`,
          [game.id, options.profileId ?? null, options.profileIds ?? null],
        ),
      ]);
      return {
        data,
        sessions: stats.rows[0].sessions,
        minutes: Number(stats.rows[0].minutes),
        days: Number(stats.rows[0].days),
      };
    });
  },
});
