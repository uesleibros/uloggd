import { notFound } from "next/navigation";
import { ModerationConsole } from "@/components/moderation/moderation-console";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";
import "./moderation.css";

export default async function ModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  if (!hasLocale(lang)) notFound();
  const user = await getAuthUser();
  if (!user) notFound();
  const supabase = await getSupabase();
  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (actor?.role !== "MODERATOR" && actor?.role !== "ADMIN") notFound();

  const requestedStatus =
    typeof query.status === "string" ? query.status.toUpperCase() : "OPEN";
  const status = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED", "ALL"].includes(
    requestedStatus,
  )
    ? requestedStatus
    : "OPEN";
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 32) : "";

  const reportQuery = supabase
    .from("reports")
    .select(
      "id,reporter_id,target_profile_id,content_type,content_id,reason,details,status,created_at,moderator_note,reviewed_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  let accountQuery = supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,role,verified,created_at")
    .order("created_at", { ascending: false })
    .limit(search.length >= 2 ? 20 : 0);
  if (search.length >= 2) {
    const safeSearch = search.replace(/[%_,()]/g, "");
    accountQuery = accountQuery.or(
      `username.ilike.%${safeSearch}%,display_name.ilike.%${safeSearch}%`,
    );
  }

  const [{ data: reports }, { data: searchedAccounts }, { data: actions }] =
    await Promise.all([
      reportQuery,
      accountQuery,
      supabase
        .from("moderation_actions")
        .select(
          "id,moderator_id,target_profile_id,action,reason,created_at,metadata",
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const reportRows = reports ?? [];
  const profileIds = [
    ...new Set(
      [
        ...reportRows.flatMap((report) => [
          report.reporter_id,
          report.target_profile_id,
        ]),
        ...(searchedAccounts ?? []).map((profile) => profile.id),
        ...(actions ?? []).flatMap((action) => [
          action.moderator_id,
          action.target_profile_id,
        ]),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const commentIds = reportRows.flatMap((report) =>
    report.content_type === "PROFILE_COMMENT" && report.content_id
      ? [report.content_id]
      : [],
  );
  const [{ data: profiles }, { data: comments }, { data: moderationStates }] =
    await Promise.all([
      profileIds.length
        ? supabase
            .from("profiles")
            .select(
              "id,username,display_name,avatar_url,role,verified,created_at",
            )
            .in("id", profileIds)
        : Promise.resolve({ data: [] }),
      commentIds.length
        ? supabase
            .from("profile_comments")
            .select("id,body,deleted_at")
            .in("id", commentIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? supabase
            .from("profile_moderation_state")
            .select("profile_id,banned_at,banned_until,reason")
            .in("profile_id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <ModerationConsole
      lang={lang}
      actorRole={actor.role}
      initialStatus={status}
      initialSearch={search}
      reports={reportRows}
      accounts={searchedAccounts ?? []}
      profiles={profiles ?? []}
      comments={comments ?? []}
      moderationStates={moderationStates ?? []}
      actions={actions ?? []}
    />
  );
}
