import { apiRoute } from "@/lib/api/route";
import { activityInput } from "@/lib/api/activity-input";
import { readActivity } from "@/lib/api/activity-read";
import { readProfile } from "@/lib/api/profile-read";
import { segmentBefore, HANDLE } from "@/lib/api/path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "reviews.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const options = activityInput(request);
    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      const data = await readActivity(client, identity?.profileId ?? null, {
        ...options,
        profileId: profile.id,
        profileIds: undefined,
        kinds: options.kinds?.filter((kind) => kind !== "screenshot") ?? [
          "review",
          "diary",
        ],
      });
      return { data };
    });
  },
});
