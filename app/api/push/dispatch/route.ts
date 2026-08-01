import type { NextRequest } from "next/server";
import webpush from "web-push";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushKind, pushMessage } from "@/lib/push-copy";
import { resolvePushTarget } from "@/lib/push-target";
import type { UiLang } from "@/lib/ui-text";

/**
 * Delivers a notification row to the recipient's subscribed devices.
 *
 * Called by the database, not by a browser: notifications are written by
 * triggers, so there is no request to piggyback on. The call carries only a row
 * id and a shared secret, and everything else is loaded here with service
 * credentials, so knowing the URL is not enough to read anyone's activity.
 *
 * Whether the notification should exist at all was already decided upstream by
 * `notification_preference_enabled`. This route does not second-guess it.
 */
const bodySchema = z.object({ notification_id: z.string().uuid() });

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.PUSH_DISPATCH_SECRET,
  );
}

export async function POST(request: NextRequest) {
  // Unconfigured is not an error: an environment without keys simply does not
  // send push, and saying so plainly beats a stack trace in the logs.
  if (!configured()) return new Response(null, { status: 204 });

  const secret = request.headers.get("x-push-secret");
  if (!secret || secret !== process.env.PUSH_DISPATCH_SECRET)
    return new Response(null, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return new Response(null, { status: 400 });

  const admin = createAdminClient();
  const { data: notification } = await admin
    .from("notifications")
    .select("id,recipient_id,actor_id,kind,target_id,target_title")
    .eq("id", parsed.data.notification_id)
    .maybeSingle();
  if (!notification) return new Response(null, { status: 204 });
  if (!isPushKind(notification.kind)) {
    // A kind the database accepts and this route has no wording for would
    // otherwise arrive as a blank notification. Better to send nothing and let
    // the unit test that compares the two lists catch it.
    console.error(`[push] no copy for notification kind ${notification.kind}`);
    return new Response(null, { status: 204 });
  }

  const [{ data: recipient }, { data: actor }, { data: subscriptions }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("locale")
        .eq("id", notification.recipient_id)
        .maybeSingle(),
      notification.actor_id
        ? admin
            .from("profiles")
            .select("username,display_name")
            .eq("id", notification.actor_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("profile_id", notification.recipient_id),
    ]);

  const devices = (subscriptions ?? []) as Subscription[];
  if (devices.length === 0) return new Response(null, { status: 204 });

  const lang = (recipient?.locale as UiLang) ?? "pt-BR";
  const { title, body } = pushMessage(
    notification.kind,
    actor?.display_name || (actor?.username ? `@${actor.username}` : null),
    notification.target_title,
    lang,
  );

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@uloggd.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  // Opening the app is the point, so it carries where to land. Resolved here
  // because `notifications` stores an internal id and every route is addressed
  // by a public one; a failed lookup falls back to the feed rather than
  // producing a notification that opens nothing.
  const url = await resolvePushTarget(
    admin,
    {
      kind: notification.kind,
      actor_id: notification.actor_id,
      target_id: notification.target_id,
    },
    lang,
  );

  const payload = JSON.stringify({
    title,
    body,
    url,
    tag: notification.id,
  });

  const expired: string[] = [];
  await Promise.all(
    devices.map(async (device) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: device.endpoint,
            keys: { p256dh: device.p256dh, auth: device.auth },
          },
          payload,
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404 and 410 mean the push service has dropped this subscription for
        // good, usually an uninstalled app or cleared browser data. Keeping it
        // would mean retrying a dead endpoint on every notification forever.
        if (status === 404 || status === 410) expired.push(device.id);
        else console.error("[push] send failed", status ?? error);
      }
    }),
  );

  if (expired.length)
    await admin.from("push_subscriptions").delete().in("id", expired);

  return new Response(null, { status: 204 });
}
