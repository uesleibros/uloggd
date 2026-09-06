import { jsonBody, optionalText } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHAPE = "id, endpoint, device_label, created_at, last_used_at";

export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ identity, db }) => {
    const devices = await db(async (client) => {
      const { rows } = await client.query(
        `select ${SHAPE} from public.push_subscriptions
          where profile_id = $1
          order by created_at desc`,
        [identity.profileId],
      );
      return rows;
    });
    return { data: devices };
  },
});

/**
 * Registers a browser to be pushed to.
 *
 * The endpoint is unique across the whole table, because re-subscribing in the
 * same browser returns the same one and a duplicate would deliver twice. That
 * makes the conflict clause the only place an account could reach a row that
 * is not its own, so it says whose it is rather than trusting the policy to
 * notice.
 */
export const POST = apiRoute({
  scope: "profile.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const endpoint = optionalText(body, "endpoint", 2048);
    const p256dh = optionalText(body, "p256dh", 256);
    const auth = optionalText(body, "auth", 256);
    if (!endpoint || !p256dh || !auth)
      throw new ApiFailure(
        "invalid_request",
        "endpoint, p256dh and auth are all required.",
      );

    const saved = await db(async (client) => {
      const { rows } = await client.query(
        `insert into public.push_subscriptions
           (profile_id, endpoint, p256dh, auth, device_label)
         values ($1, $2, $3, $4, $5)
         on conflict (endpoint) do update
            set p256dh = excluded.p256dh,
                auth = excluded.auth,
                device_label = excluded.device_label
          where public.push_subscriptions.profile_id = $1
        returning ${SHAPE}`,
        [
          identity.profileId,
          endpoint,
          p256dh,
          auth,
          optionalText(body, "device_label", 120),
        ],
      );
      return rows[0] ?? null;
    });

    if (!saved)
      throw new ApiFailure("conflict", "That endpoint belongs to another account.");
    return { data: saved };
  },
});
