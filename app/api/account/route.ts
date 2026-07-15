import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { confirmation?: unknown };
  try {
    body = (await request.json()) as { confirmation?: unknown };
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.username) {
    return Response.json({ error: "profile_not_found" }, { status: 404 });
  }
  if (body.confirmation !== `@${profile.username}`) {
    return Response.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) {
    return Response.json({ error: "assurance_check_failed" }, { status: 503 });
  }
  if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    return Response.json({ error: "mfa_required" }, { status: 403 });
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: "delete_failed" }, { status: 500 });
  }
  return Response.json({ deleted: true });
}
