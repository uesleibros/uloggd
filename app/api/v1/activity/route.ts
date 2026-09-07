import { apiRoute } from "@/lib/api/route";
import { activityInput } from "@/lib/api/activity-input";
import { readActivity } from "@/lib/api/activity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const options = activityInput(request);
    return {
      data: await db((client) =>
        readActivity(client, identity?.profileId ?? null, options),
      ),
    };
  },
});
