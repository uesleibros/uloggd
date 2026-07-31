import { notFound } from "next/navigation";
import { ModerationConsole } from "@/components/moderation/moderation-console";
import {
  MODERATION_REPORT_STATE_VALUES,
  MODERATION_PAGE_SIZE,
  MODERATION_AUDIT_PAGE_SIZE,
  clampPage,
  isModerationStatus,
  type ModerationStatus,
} from "@/lib/moderation";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import {
  isMissingSchemaError,
  warnSchemaGap,
} from "@/lib/supabase/schema-fallback";
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
  const status: ModerationStatus = isModerationStatus(requestedStatus)
    ? requestedStatus
    : "OPEN";
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 32) : "";

  // The totals come first because they decide how many pages exist, which in
  // turn decides which slice the queries below are allowed to ask for.
  const [{ count: auditTotal }, ...countResults] = await Promise.all([
    supabase
      .from("moderation_actions")
      .select("id", { count: "exact", head: true }),
    ...MODERATION_REPORT_STATE_VALUES.map((entry) =>
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", entry),
    ),
  ]);
  const statusCounts = Object.fromEntries(
    MODERATION_REPORT_STATE_VALUES.map((entry, index) => [
      entry,
      countResults[index]?.count ?? 0,
    ]),
  ) as Record<ModerationStatus, number>;
  statusCounts.ALL = MODERATION_REPORT_STATE_VALUES.reduce(
    (sum, entry) => sum + (statusCounts[entry] ?? 0),
    0,
  );

  // Reports are filtered by status only, the search box targets accounts, so
  // the tab count is already the total for this view.
  const reportTotal = statusCounts[status] ?? 0;
  const { page, pageCount } = clampPage(
    query.page,
    reportTotal,
    MODERATION_PAGE_SIZE,
  );
  const { page: auditPage, pageCount: auditPageCount } = clampPage(
    query.audit,
    auditTotal ?? 0,
    MODERATION_AUDIT_PAGE_SIZE,
  );
  const reportOffset = (page - 1) * MODERATION_PAGE_SIZE;
  const auditOffset = (auditPage - 1) * MODERATION_AUDIT_PAGE_SIZE;

  let reportQuery = supabase
    .from("reports")
    .select(
      "id,reporter_id,target_profile_id,content_type,content_id,reason,details,status,created_at,moderator_note,reviewed_at",
    )
    .order("created_at", { ascending: false })
    .range(reportOffset, reportOffset + MODERATION_PAGE_SIZE - 1);
  if (status !== "ALL") reportQuery = reportQuery.eq("status", status);

  let accountQuery = supabase
    .from("profiles")
    .select(
      "id,username,display_name,avatar_url,role,verified,account_type,created_at",
    )
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
        .range(auditOffset, auditOffset + MODERATION_AUDIT_PAGE_SIZE - 1),
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
  const screenshotIds = reportRows.flatMap((report) =>
    report.content_type === "SCREENSHOT" && report.content_id
      ? [report.content_id]
      : [],
  );
  const [
    { data: profiles },
    { data: comments },
    screenshotResult,
    { data: moderationStates },
  ] = await Promise.all([
    profileIds.length
      ? supabase
          .from("profiles")
          .select(
            "id,username,display_name,avatar_url,role,verified,account_type,created_at",
          )
          .in("id", profileIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase
          .from("profile_comments")
          .select("id,body,deleted_at")
          .in("id", commentIds)
      : Promise.resolve({ data: [] }),
    screenshotIds.length
      ? supabase
          .from("screenshots")
          .select(
            "id,public_id,storage_path,description,igdb_id,game_slug,width,height,contains_spoilers,deleted_at",
          )
          .in("id", screenshotIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? supabase
          .from("profile_moderation_state")
          .select("profile_id,banned_at,banned_until,reason")
          .in("profile_id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);
  // deleted_at comes from a migration that may still be pending; asking for it
  // against an older schema fails the whole select and leaves every screenshot
  // report with no evidence attached.
  let screenshotRows = screenshotResult.data;
  if (isMissingSchemaError(screenshotResult.error)) {
    warnSchemaGap(
      "screenshots.deleted_at (moderation)",
      screenshotResult.error,
    );
    const { data: fallback } = await supabase
      .from("screenshots")
      .select(
        "id,public_id,storage_path,description,igdb_id,game_slug,width,height,contains_spoilers",
      )
      .in("id", screenshotIds);
    screenshotRows = (fallback ?? []).map((row) => ({
      ...row,
      deleted_at: null,
    })) as NonNullable<typeof screenshotRows>;
  }

  const paths = (screenshotRows ?? [])
    .filter((row) => !row.deleted_at)
    .map((row) => row.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("screenshots").createSignedUrls(paths, 3600)
    : { data: [] };
  const signedByPath = new Map(
    (signed ?? []).map((entry) => [entry.path, entry.signedUrl]),
  );
  const screenshots = (screenshotRows ?? []).map((row) => ({
    id: row.id,
    publicId: row.public_id,
    description: row.description,
    igdbId: row.igdb_id,
    gameSlug: row.game_slug,
    width: row.width,
    height: row.height,
    containsSpoilers: row.contains_spoilers,
    deletedAt: row.deleted_at ?? null,
    imageUrl: signedByPath.get(row.storage_path) ?? null,
  }));

  return (
    <ModerationConsole
      key={`${status}:${search}:${page}:${auditPage}:${reportRows
        .map((report) => `${report.id}:${report.status}`)
        .join(",")}:${actions?.[0]?.id ?? ""}`}
      lang={lang}
      actorRole={actor.role}
      initialStatus={status}
      initialSearch={search}
      reports={reportRows}
      statusCounts={statusCounts}
      accounts={searchedAccounts ?? []}
      profiles={profiles ?? []}
      comments={comments ?? []}
      screenshots={screenshots}
      moderationStates={moderationStates ?? []}
      actions={actions ?? []}
      page={page}
      pageCount={pageCount}
      pageSize={MODERATION_PAGE_SIZE}
      reportTotal={reportTotal}
      auditPage={auditPage}
      auditPageCount={auditPageCount}
      auditTotal={auditTotal ?? 0}
    />
  );
}
