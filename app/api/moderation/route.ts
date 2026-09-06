import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

/**
 * Staff work, and deliberately not v1.
 *
 * Deciding a report and reading who is banned are not things anybody was ever
 * given a key to do, and publishing them would turn the shape of the
 * moderation queue into a contract we would owe an integration. They stay
 * here, on a session, where the surface can keep changing with the console
 * that uses it.
 *
 * There is no permission check in this file. The definer functions and the
 * policies behind them already refuse anyone who is not staff, and a second
 * check written here is one that can disagree with the first.
 */
const reason = z.string().trim().max(1000).nullable().optional();

const act = z.discriminatedUnion("do", [
  z.object({
    do: z.literal("report"),
    report: z.uuid(),
    status: z.enum(["RESOLVED", "DISMISSED"]),
    note: reason,
  }),
  z.object({
    do: z.literal("profile"),
    profile: z.uuid(),
    action: z.string().max(40),
    reason,
    duration_days: z.number().int().positive().nullable().optional(),
  }),
  z.object({
    do: z.literal("comment"),
    comment: z.uuid(),
    table: z.enum(["CONTENT_COMMENT", "PROFILE_COMMENT"]),
    report: z.uuid(),
    reason,
  }),
  z.object({
    do: z.literal("screenshot"),
    screenshot: z.uuid(),
    report: z.uuid(),
    reason,
  }),
  z.object({ do: z.literal("search"), term: z.string().trim().max(80) }),
]);

export async function POST(request: NextRequest) {
  if (!(await getAuthUser()))
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = act.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await getSupabase();
  const asked = parsed.data;
  const call =
    asked.do === "report"
      ? supabase.rpc("moderate_report", {
          target_report: asked.report,
          next_status: asked.status,
          note: asked.note ?? null,
        })
      : asked.do === "profile"
        ? supabase.rpc("moderate_profile", {
            target_profile: asked.profile,
            moderation_action: asked.action,
            reason: asked.reason ?? null,
            duration_days: asked.duration_days ?? null,
          })
        : asked.do === "comment"
          ? supabase.rpc(
              asked.table === "CONTENT_COMMENT"
                ? "moderate_content_comment"
                : "moderate_profile_comment",
              {
                target_comment: asked.comment,
                reason: asked.reason ?? null,
                target_report: asked.report,
              },
            )
          : asked.do === "screenshot"
            ? supabase.rpc("moderate_screenshot", {
                target_screenshot: asked.screenshot,
                reason: asked.reason ?? null,
                target_report: asked.report,
              })
            : supabase.rpc("moderation_search_accounts", {
                term: asked.term,
              });

  const { data, error } = await call;
  if (error) return Response.json({ error: "refused" }, { status: 403 });
  return Response.json({ ok: true, data: data ?? null });
}

const wanted = z.object({
  ids: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(100)),
});

export async function GET(request: NextRequest) {
  if (!(await getAuthUser()))
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = wanted.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("profile_moderation_state")
    .select("profile_id,banned_at,banned_until,reason")
    .in("profile_id", parsed.data.ids);
  if (error) return Response.json({ error: "refused" }, { status: 403 });
  return Response.json({ states: data ?? [] });
}
