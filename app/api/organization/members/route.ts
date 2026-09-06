import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

/**
 * Who belongs to an organization account.
 *
 * Internal rather than v1, for the same reason the moderation console is: it
 * is one screen's plumbing, used by the account that owns the organization
 * and nobody else, and publishing it would freeze that screen's shape as a
 * promise.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("organization_members_of", {
    target: user.id,
  });
  if (error) return Response.json({ error: "refused" }, { status: 403 });
  return Response.json({ members: data ?? [] });
}

const named = z.object({
  username: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, ""))
    .pipe(z.string().min(1).max(40)),
});

export async function POST(request: NextRequest) {
  if (!(await getAuthUser()))
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = named.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("add_organization_member", {
    member_username: parsed.data.username,
  });
  // The function tells a name nobody has apart from an account that may not
  // join, and the form says which, so the codes travel rather than collapsing
  // into one shrug.
  if (error)
    return Response.json(
      { error: error.code === "P0002" ? "not_found" : "refused" },
      { status: error.code === "P0002" ? 404 : 400 },
    );
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = named.safeParse({
    username: request.nextUrl.searchParams.get("username") ?? "",
  });
  if (!parsed.success)
    return Response.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (!profile) return Response.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", user.id)
    .eq("member_id", profile.id);
  if (error) return Response.json({ error: "refused" }, { status: 403 });
  return Response.json({ ok: true });
}
