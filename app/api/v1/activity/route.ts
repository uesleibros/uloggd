import { apiRoute } from "@/lib/api/route";
import { activityInput } from "@/lib/api/activity-input";
import { readActivity } from "@/lib/api/activity-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  // The public gallery is the same for everybody and only changes when
  // somebody uploads, so half a minute of reuse costs a visitor nothing and
  // saves the home page a round trip and a catalogue read on every visit.
  // Anything asked about particular people is a feed, and a feed is not kept:
  // posting something and not finding it where you just posted it is worse
  // than a slower page.
  browserCache: (request) => {
    const query = new URL(request.url).searchParams;
    const gallery =
      query.get("kinds") === "screenshot" &&
      !query.get("profile") &&
      !query.get("profiles") &&
      !query.get("game");
    return gallery ? 30 : null;
  },
  handle: async ({ request, identity, db }) => {
    const options = activityInput(request);
    return {
      data: await db((client) =>
        readActivity(client, identity?.profileId ?? null, options),
      ),
    };
  },
});
