"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Clock3, Flag, ShieldCheck, X } from "lucide-react";
import { Pagination } from "@/components/pagination";
import {
  MODERATION_AUDIT_PAGE_SIZE,
  type ModerationStatus,
} from "@/lib/moderation";
import { tri, type UiLang } from "@/lib/ui-text";
import { AccountPanel } from "./account-panel";
import { AuditLog } from "./audit-log";
import { ModerationDialogs } from "./moderation-dialogs";
import { ReportCard } from "./report-card";
import type {
  ModerationAction,
  ModerationBan,
  ModerationComment,
  ModerationProfile,
  ModerationReport,
  ModerationScreenshot,
  ProfileAction,
  Removal,
} from "./types";

/**
 * One staff action, through the console's own route.
 *
 * The permission check lives in the definer functions the route calls, which
 * is where it has always lived. This only carries the ask across and reports
 * whether it was allowed.
 */
async function moderate(body: Record<string, unknown>) {
  const answer = await fetch("/api/moderation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!answer.ok) return { data: null, refused: true };
  return { data: (await answer.json()).data as unknown, refused: false };
}

/**
 * What this session decided, before the server has said it back.
 *
 * `from` is the status the decision was made against, and it is what makes
 * the overlay expire on its own. Once the server sends the report as anything
 * other than that, the decision has either landed or been overtaken by
 * somebody else's, and either way what the server says is now the truth.
 */
type Decision = {
  from: string;
  status: Exclude<ModerationStatus, "ALL">;
  note: string | null;
  reviewedAt: string;
};

export function ModerationConsole({
  lang,
  actorRole,
  status,
  search,
  reports,
  statusCounts,
  accounts,
  profiles,
  comments,
  screenshots,
  bans,
  actions,
  page,
  pageCount,
  reportTotal,
  auditPage,
  auditPageCount,
  auditTotal,
}: {
  lang: UiLang;
  actorRole: "MODERATOR" | "ADMIN";
  status: ModerationStatus;
  search: string;
  reports: ModerationReport[];
  statusCounts: Record<ModerationStatus, number>;
  accounts: ModerationProfile[];
  profiles: ModerationProfile[];
  comments: ModerationComment[];
  screenshots: ModerationScreenshot[];
  bans: ModerationBan[];
  actions: ModerationAction[];
  page: number;
  pageCount: number;
  reportTotal: number;
  auditPage: number;
  auditPageCount: number;
  auditTotal: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const queueRef = useRef<HTMLElement>(null);

  /**
   * What this session has decided, laid over what the server last sent.
   *
   * The console used to keep its own copy of every list and the page keyed it
   * on the data, so each decision remounted the whole console and took the
   * notes, the account search and the scroll position with it. Nothing is
   * mirrored now: the server's rows are the rows, and this holds only the
   * difference until the refresh catches up. Each entry remembers the status
   * it was decided against, so it stops applying by itself the moment the
   * server sends something else, whether that is this decision landing or
   * another moderator's arriving first.
   */
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map());
  // The term lives here because this is what writes it into the URL.
  const [term, setTerm] = useState(search);
  const [searchResults, setSearchResults] = useState(accounts);
  const [foundProfiles, setFoundProfiles] = useState<ModerationProfile[]>([]);
  const [foundBans, setFoundBans] = useState<ModerationBan[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<{
    profile: ModerationProfile;
    action: ProfileAction;
  } | null>(null);
  const [removal, setRemoval] = useState<{
    removal: Removal;
    note: string | null;
  } | null>(null);

  const profileById = useMemo(() => {
    const map = new Map<string, ModerationProfile>();
    for (const profile of profiles) map.set(profile.id, profile);
    for (const profile of foundProfiles) map.set(profile.id, profile);
    return map;
  }, [profiles, foundProfiles]);

  const banByProfile = useMemo(() => {
    const map = new Map<string, ModerationBan>();
    for (const ban of bans) map.set(ban.profile_id, ban);
    for (const ban of foundBans) map.set(ban.profile_id, ban);
    return map;
  }, [bans, foundBans]);

  const commentById = useMemo(
    () => new Map(comments.map((comment) => [comment.id, comment])),
    [comments],
  );
  const screenshotById = useMemo(
    () => new Map(screenshots.map((shot) => [shot.id, shot])),
    [screenshots],
  );

  // The rows as they stand: what the server sent, with this session's
  // decisions applied, minus anything that no longer belongs to this tab.
  const rows = useMemo(
    () =>
      reports
        .map((report) => {
          const decided = decisions.get(report.id);
          return decided && decided.from === report.status
            ? {
                ...report,
                status: decided.status,
                moderator_note: decided.note ?? report.moderator_note,
                reviewed_at: decided.reviewedAt,
              }
            : report;
        })
        .filter((report) => status === "ALL" || report.status === status),
    [reports, decisions, status],
  );

  const counts = useMemo(() => {
    const next = { ...statusCounts };
    for (const report of reports) {
      const decided = decisions.get(report.id);
      if (!decided || decided.from !== report.status) continue;
      const from = report.status as Exclude<ModerationStatus, "ALL">;
      next[from] = Math.max(0, (next[from] ?? 0) - 1);
      next[decided.status] = (next[decided.status] ?? 0) + 1;
    }
    return next;
  }, [statusCounts, reports, decisions]);

  const tabs: {
    id: ModerationStatus;
    label: string;
    icon: typeof Flag;
  }[] = [
    { id: "OPEN", label: tri(lang, "Abertas", "Open", "Abiertas"), icon: Flag },
    {
      id: "REVIEWING",
      label: tri(lang, "Em análise", "Reviewing", "En revisión"),
      icon: Clock3,
    },
    {
      id: "RESOLVED",
      label: tri(lang, "Resolvidas", "Resolved", "Resueltas"),
      icon: Check,
    },
    {
      id: "DISMISSED",
      label: tri(lang, "Descartadas", "Dismissed", "Descartadas"),
      icon: X,
    },
    { id: "ALL", label: tri(lang, "Todas", "All", "Todas"), icon: ShieldCheck },
  ];

  // Every filter and both pagers write to the same URL, so a moderator can hand
  // a colleague the address bar and land them on the exact same view.
  function navigate(
    next: { status?: ModerationStatus; page?: number; audit?: number },
    anchor?: React.RefObject<HTMLElement | null>,
  ) {
    const params = new URLSearchParams();
    params.set("status", next.status ?? status);
    if (term.trim()) params.set("q", term.trim());
    const nextPage = next.page ?? page;
    if (nextPage > 1) params.set("page", String(nextPage));
    const nextAudit = next.audit ?? auditPage;
    if (nextAudit > 1) params.set("audit", String(nextAudit));
    // scroll: false keeps a page change inside the section it belongs to; the
    // default would fling the moderator back to the hero every click.
    startNavigation(() =>
      router.push(`${pathname}?${params.toString()}`, { scroll: false }),
    );
    anchor?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function decide(
    reportId: string,
    next: "REVIEWING" | "RESOLVED" | "DISMISSED",
    note: string | null,
  ) {
    if (pending) return;
    const current = rows.find((report) => report.id === reportId);
    if (current?.status === "RESOLVED" || current?.status === "DISMISSED")
      return;
    setPending(`report-${reportId}-${next}`);
    setError(null);
    const { refused } = await moderate({
      do: "report",
      report: reportId,
      status: next,
      note,
    });
    if (refused) {
      setError(
        tri(
          lang,
          "Não foi possível atualizar a denúncia.",
          "Could not update the report.",
          "No se pudo actualizar la denuncia.",
        ),
      );
    } else {
      setDecisions((map) =>
        new Map(map).set(reportId, {
          from: current?.status ?? "OPEN",
          status: next,
          note,
          reviewedAt: new Date().toISOString(),
        }),
      );
      router.refresh();
    }
    setPending(null);
  }

  async function runSearch(term: string) {
    if (term.length < 2 || searching) return;
    setSearching(true);
    setError(null);
    // `role` cannot be selected from `profiles` any more, and the console is
    // the one caller that needs it. The definer function checks the caller is
    // a moderator, and carries the cap and the escaping with it.
    const { data, refused } = await moderate({ do: "search", term });
    if (refused) {
      setError(
        tri(
          lang,
          "Não foi possível buscar usuários.",
          "Could not search users.",
          "No se pudieron buscar usuarios.",
        ),
      );
      setSearching(false);
      return;
    }
    const found = (data ?? []) as ModerationProfile[];
    setSearchResults(found);
    setFoundProfiles(found);
    if (found.length) {
      const ids = found.map((profile) => profile.id);
      const answer = await fetch(
        `/api/moderation?ids=${encodeURIComponent(ids.join(","))}`,
      );
      setFoundBans(
        answer.ok
          ? (((await answer.json()).states ?? []) as ModerationBan[])
          : [],
      );
    } else {
      setFoundBans([]);
    }
    // The term belongs in the address bar so the view can be handed over, but
    // it must not reload the queue underneath the results.
    const params = new URLSearchParams(window.location.search);
    if (term) params.set("q", term);
    else params.delete("q");
    window.history.replaceState(
      null,
      "",
      `${pathname}${params.size ? `?${params}` : ""}`,
    );
    setSearching(false);
  }

  const busy = Boolean(pending);

  return (
    <main className="moderation-page">
      <header className="moderation-hero">
        <h1>{tri(lang, "Moderação", "Moderation", "Moderación")}</h1>
        <span className="moderation-role" data-role={actorRole}>
          {actorRole === "ADMIN"
            ? tri(lang, "Administrador", "Admin", "Administrador")
            : tri(lang, "Moderador", "Moderator", "Moderador")}
        </span>
      </header>

      {error && (
        <p className="moderation-error" role="alert">
          {error}
        </p>
      )}

      <div className="moderation-workspace">
        <section className="moderation-section moderation-queue" ref={queueRef}>
          <header>
            <h2>{tri(lang, "Denúncias", "Reports", "Denuncias")}</h2>
            <p>
              {reportTotal === 1
                ? tri(lang, "1 denúncia", "1 report", "1 denuncia")
                : tri(
                    lang,
                    `${reportTotal} denúncias`,
                    `${reportTotal} reports`,
                    `${reportTotal} denuncias`,
                  )}
            </p>
          </header>

          <div className="moderation-tabs-rail">
            <div
              className="moderation-status-tabs"
              role="tablist"
              aria-label={tri(
                lang,
                "Filtrar denúncias",
                "Filter reports",
                "Filtrar denuncias",
              )}
            >
              {tabs.map(({ id, label, icon: Icon }, index) => (
                <button
                  type="button"
                  role="tab"
                  key={id}
                  aria-selected={status === id}
                  tabIndex={status === id ? 0 : -1}
                  onClick={() => navigate({ status: id, page: 1 }, queueRef)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const target =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              tabs.length) %
                            tabs.length;
                    navigate({ status: tabs[target].id, page: 1 }, queueRef);
                  }}
                >
                  <Icon size={14} aria-hidden />
                  {label}
                  {(counts[id] ?? 0) > 0 && <b>{counts[id]}</b>}
                </button>
              ))}
            </div>
          </div>

          <div className="moderation-report-list" aria-busy={navigating}>
            {rows.length === 0 ? (
              <p className="moderation-empty" data-clear>
                <Check size={20} aria-hidden />
                {status === "OPEN"
                  ? tri(
                      lang,
                      "Nada aberto. A fila está limpa.",
                      "Nothing open. The queue is clear.",
                      "Nada abierto. La cola está limpia.",
                    )
                  : tri(
                      lang,
                      "Nenhuma denúncia neste estado.",
                      "No reports in this state.",
                      "Ninguna denuncia en este estado.",
                    )}
              </p>
            ) : (
              rows.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  lang={lang}
                  target={
                    report.target_profile_id
                      ? profileById.get(report.target_profile_id)
                      : undefined
                  }
                  reporter={profileById.get(report.reporter_id)}
                  comment={
                    report.content_id
                      ? commentById.get(report.content_id)
                      : undefined
                  }
                  screenshot={
                    report.content_id
                      ? screenshotById.get(report.content_id)
                      : undefined
                  }
                  busy={busy}
                  pendingKey={pending}
                  onDecide={(id, next, note) => void decide(id, next, note)}
                  onRemove={(next, note) => {
                    setError(null);
                    setRemoval({ removal: next, note });
                  }}
                />
              ))
            )}
          </div>

          <Pagination
            jump={false}
            page={page}
            totalPages={pageCount}
            pending={navigating}
            lang={lang}
            onGo={(next) => navigate({ page: next }, queueRef)}
          />
        </section>

        <div className="moderation-rail">
          <AccountPanel
            lang={lang}
            actorRole={actorRole}
            term={term}
            onTermChange={setTerm}
            results={searchResults}
            bans={banByProfile}
            searching={searching}
            busy={busy}
            onSearch={(term) => void runSearch(term)}
            onClear={() => {
              setTerm("");
              setSearchResults([]);
              setFoundBans([]);
              setError(null);
              const params = new URLSearchParams(window.location.search);
              params.delete("q");
              window.history.replaceState(
                null,
                "",
                `${pathname}${params.size ? `?${params}` : ""}`,
              );
            }}
            onAct={(profile, action) => {
              setError(null);
              setProfileTarget({ profile, action });
            }}
          />

          <AuditLog
            lang={lang}
            actions={actions}
            profiles={profileById}
            page={auditPage}
            pageCount={auditPageCount}
            total={auditTotal}
            busy={navigating}
            onGo={(next) => navigate({ audit: next })}
          />
        </div>
      </div>

      <ModerationDialogs
        lang={lang}
        actorRole={actorRole}
        profileTarget={profileTarget}
        removal={removal}
        pending={pending}
        onClose={() => {
          setProfileTarget(null);
          setRemoval(null);
        }}
        onProfileDone={(profile, action) => {
          setSearchResults((current) =>
            current.map((row) =>
              row.id === profile.id ? applyAction(row, action) : row,
            ),
          );
          setFoundProfiles((current) =>
            current.map((row) =>
              row.id === profile.id ? applyAction(row, action) : row,
            ),
          );
          router.refresh();
        }}
        onBanChanged={(profileId, ban) =>
          setFoundBans((current) => [
            ...current.filter((row) => row.profile_id !== profileId),
            ...(ban ? [ban] : []),
          ])
        }
        onRemovalDone={(reportId, note) => {
          const before = reports.find((report) => report.id === reportId);
          setDecisions((map) =>
            new Map(map).set(reportId, {
              from: before?.status ?? "OPEN",
              status: "RESOLVED",
              note,
              reviewedAt: new Date().toISOString(),
            }),
          );
          router.refresh();
        }}
        setPending={setPending}
        error={error}
        setError={setError}
      />

      <p className="moderation-audit-note">
        {tri(
          lang,
          `Cada decisão entra na auditoria com seu nome. Mostrando ${MODERATION_AUDIT_PAGE_SIZE} por página.`,
          `Every decision enters the audit log under your name. Showing ${MODERATION_AUDIT_PAGE_SIZE} per page.`,
          `Cada decisión entra en la auditoría con tu nombre. Mostrando ${MODERATION_AUDIT_PAGE_SIZE} por página.`,
        )}
      </p>
    </main>
  );
}

/** What a decided action does to the row on screen. */
function applyAction(
  profile: ModerationProfile,
  action: ProfileAction,
): ModerationProfile {
  if (action === "VERIFY") return { ...profile, verified: true };
  if (action === "UNVERIFY") return { ...profile, verified: false };
  if (action === "DEMOTE_ORGANIZATION")
    return { ...profile, account_type: "PERSON" };
  return profile;
}
