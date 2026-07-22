"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@/components/ui/select";
import {
  Ban,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Flag,
  LoaderCircle,
  MessageSquareOff,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VerifiedMark } from "@/components/verified-badge";
import { RelativeTime } from "@/components/relative-time";
import {
  MODERATION_BAN_DURATIONS,
  type ModerationStatus,
} from "@/lib/moderation";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Role = "USER" | "MODERATOR" | "ADMIN";
type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  verified: boolean;
  created_at: string;
};
type Report = {
  id: string;
  reporter_id: string;
  target_profile_id: string | null;
  content_type: string | null;
  content_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  moderator_note: string | null;
  reviewed_at: string | null;
};
type ModerationState = {
  profile_id: string;
  banned_at: string;
  banned_until: string | null;
  reason: string;
};
type Action = {
  id: string;
  moderator_id: string;
  target_profile_id: string | null;
  action: string;
  reason: string | null;
  created_at: string;
  metadata: unknown;
};
type Screenshot = {
  id: string;
  publicId: string;
  description: string | null;
  igdbId: number;
  gameSlug: string;
  width: number;
  height: number;
  containsSpoilers: boolean;
  deletedAt: string | null;
  imageUrl: string | null;
};
type ProfileAction = "BAN" | "UNBAN" | "VERIFY" | "UNVERIFY";
type Removal =
  | { kind: "COMMENT"; reportId: string; commentId: string }
  | { kind: "SCREENSHOT"; reportId: string; screenshotId: string };

export function ModerationConsole({
  lang,
  actorRole,
  initialStatus,
  initialSearch,
  reports,
  statusCounts,
  accounts,
  profiles,
  comments,
  screenshots,
  moderationStates,
  actions,
}: {
  lang: UiLang;
  actorRole: "MODERATOR" | "ADMIN";
  initialStatus: ModerationStatus;
  initialSearch: string;
  reports: Report[];
  statusCounts: Record<ModerationStatus, number>;
  accounts: Profile[];
  profiles: Profile[];
  comments: { id: string; body: string; deleted_at: string | null }[];
  screenshots: Screenshot[];
  moderationStates: ModerationState[];
  actions: Action[];
}) {
  const t = uiText(lang);
  const pathname = usePathname();
  const router = useRouter();
  const [reportRows, setReportRows] = useState(reports);
  const [search, setSearch] = useState(initialSearch);
  const [accountRows, setAccountRows] = useState(accounts);
  const [knownProfiles, setKnownProfiles] = useState(profiles);
  const [moderationStateRows, setModerationStateRows] =
    useState(moderationStates);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [targetAction, setTargetAction] = useState<{
    profile: Profile;
    action: ProfileAction;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [commentRows, setCommentRows] = useState(comments);
  const [screenshotRows, setScreenshotRows] = useState(screenshots);
  const [duration, setDuration] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [renderedAt] = useState(() => Date.now());
  const profileById = useMemo(
    () => new Map(knownProfiles.map((profile) => [profile.id, profile])),
    [knownProfiles],
  );
  const commentById = useMemo(
    () => new Map(commentRows.map((comment) => [comment.id, comment])),
    [commentRows],
  );
  const screenshotById = useMemo(
    () => new Map(screenshotRows.map((shot) => [shot.id, shot])),
    [screenshotRows],
  );
  const stateByProfile = useMemo(
    () =>
      new Map(moderationStateRows.map((state) => [state.profile_id, state])),
    [moderationStateRows],
  );

  // Every panel above is seeded from a server prop, and useState ignores a prop
  // that changes later. Switching the status tab is a router.push, so without
  // this the URL and the highlighted tab moved while the rows stayed on
  // whichever tab the console first rendered.
  const serverKey = useMemo(
    () =>
      [
        initialStatus,
        initialSearch,
        reports.map((report) => `${report.id}:${report.status}`).join(),
      ].join("|"),
    [initialStatus, initialSearch, reports],
  );
  const [syncedServerKey, setSyncedServerKey] = useState(serverKey);
  if (syncedServerKey !== serverKey) {
    setSyncedServerKey(serverKey);
    setReportRows(reports);
    setCommentRows(comments);
    setScreenshotRows(screenshots);
    setAccountRows(accounts);
    setModerationStateRows(moderationStates);
    // Profiles pulled in by the client-side account search are absent from the
    // server payload; keep them so names already on screen do not blank out.
    setKnownProfiles((current) => {
      const merged = new Map(current.map((profile) => [profile.id, profile]));
      profiles.forEach((profile) => merged.set(profile.id, profile));
      return [...merged.values()];
    });
    setError(null);
    setPending(null);
  }

  function profileName(profile: Profile | undefined) {
    return profile?.display_name || `@${profile?.username ?? "usuário"}`;
  }

  function openProfileAction(profile: Profile, action: ProfileAction) {
    setError(null);
    setReason("");
    if (action === "BAN") setDuration("7");
    setTargetAction({ profile, action });
  }

  function openRemoval(next: Removal) {
    setError(null);
    setRemovalReason("");
    setRemoval(next);
  }

  const dialogOpen = Boolean(targetAction) || Boolean(removal);
  const needsReason =
    targetAction?.action === "BAN" || targetAction?.action === "UNBAN";
  const profilePending =
    targetAction !== null && pending === `profile-${targetAction.profile.id}`;
  const removalPending =
    removal !== null &&
    (pending === `comment-${removal.kind === "COMMENT" ? removal.commentId : ""}` ||
      pending ===
        `screenshot-${removal.kind === "SCREENSHOT" ? removal.screenshotId : ""}`);

  const statusTabs: {
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

  function setStatus(next: ModerationStatus) {
    const params = new URLSearchParams();
    params.set("status", next);
    if (search.trim()) params.set("q", search.trim());
    router.push(`${pathname}?${params.toString()}`);
  }

  async function searchAccounts(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim().slice(0, 32);
    if (query.length < 2 || searching) return;
    setSearching(true);
    setError(null);
    const safeSearch = query.replace(/[%_,()]/g, "");
    const { data, error: searchError } = await createClient()
      .from("profiles")
      .select("id,username,display_name,avatar_url,role,verified,created_at")
      .or(`username.ilike.%${safeSearch}%,display_name.ilike.%${safeSearch}%`)
      .limit(20);
    if (searchError) {
      setError(
        tri(
          lang,
          "Não foi possível buscar usuários.",
          "Could not search users.",
          "No se pudieron buscar usuarios.",
        ),
      );
    } else {
      const rows = (data ?? []) as Profile[];
      setAccountRows(rows);
      setKnownProfiles((current) => {
        const merged = new Map(current.map((profile) => [profile.id, profile]));
        rows.forEach((profile) => merged.set(profile.id, profile));
        return [...merged.values()];
      });
      if (rows.length) {
        const ids = rows.map((profile) => profile.id);
        const { data: states } = await createClient()
          .from("profile_moderation_state")
          .select("profile_id,banned_at,banned_until,reason")
          .in("profile_id", ids);
        const idSet = new Set(ids);
        setModerationStateRows((current) => [
          ...current.filter((state) => !idSet.has(state.profile_id)),
          ...((states ?? []) as ModerationState[]),
        ]);
      }
      const params = new URLSearchParams();
      params.set("status", initialStatus);
      params.set("q", query);
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
    setSearching(false);
  }

  async function updateReport(reportId: string, status: string) {
    if (pending) return;
    setPending(`report-${reportId}-${status}`);
    setError(null);
    const { error: actionError } = await createClient().rpc("moderate_report", {
      target_report: reportId,
      next_status: status,
      note: notes[reportId]?.trim() || null,
    });
    if (actionError)
      setError(
        tri(
          lang,
          "Não foi possível atualizar a denúncia.",
          "Could not update the report.",
          "No se pudo actualizar la denuncia.",
        ),
      );
    else
      setReportRows((current) =>
        current.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status,
                moderator_note:
                  notes[reportId]?.trim() || report.moderator_note,
              }
            : report,
        ),
      );
    setPending(null);
  }

  async function performProfileAction() {
    if (!targetAction || pending) return;
    const requiresReason =
      targetAction.action === "BAN" || targetAction.action === "UNBAN";
    if (requiresReason && reason.trim().length < 3) return;
    setPending(`profile-${targetAction.profile.id}`);
    setError(null);
    const { error: actionError } = await createClient().rpc(
      "moderate_profile",
      {
        target_profile: targetAction.profile.id,
        moderation_action: targetAction.action,
        reason: reason.trim() || null,
        duration_days:
          targetAction.action === "BAN"
            ? duration === "permanent"
              ? null
              : Number(duration)
            : null,
      },
    );
    if (actionError)
      setError(
        tri(
          lang,
          "A ação foi recusada. Verifique sua permissão e o motivo.",
          "The action was refused. Check your permission and reason.",
          "La acción fue rechazada. Revisa tu permiso y el motivo.",
        ),
      );
    else {
      setTargetAction(null);
      setReason("");
      setAccountRows((current) =>
        current.map((profile) =>
          profile.id === targetAction.profile.id
            ? {
                ...profile,
                verified:
                  targetAction.action === "VERIFY"
                    ? true
                    : targetAction.action === "UNVERIFY"
                      ? false
                      : profile.verified,
              }
            : profile,
        ),
      );
      setKnownProfiles((current) =>
        current.map((profile) =>
          profile.id === targetAction.profile.id
            ? {
                ...profile,
                verified:
                  targetAction.action === "VERIFY"
                    ? true
                    : targetAction.action === "UNVERIFY"
                      ? false
                      : profile.verified,
              }
            : profile,
        ),
      );
      if (targetAction.action === "BAN") {
        const days = duration === "permanent" ? null : Number(duration);
        setModerationStateRows((current) => [
          ...current.filter(
            (state) => state.profile_id !== targetAction.profile.id,
          ),
          {
            profile_id: targetAction.profile.id,
            banned_at: new Date().toISOString(),
            banned_until: days
              ? new Date(Date.now() + days * 86_400_000).toISOString()
              : null,
            reason: reason.trim(),
          },
        ]);
      } else if (targetAction.action === "UNBAN") {
        setModerationStateRows((current) =>
          current.filter(
            (state) => state.profile_id !== targetAction.profile.id,
          ),
        );
      }
    }
    setPending(null);
  }

  async function performRemoval() {
    if (!removal || pending) return;
    const client = createClient();
    const clean = removalReason.trim() || null;
    if (removal.kind === "COMMENT") {
      setPending(`comment-${removal.commentId}`);
      setError(null);
      const { data, error: removalError } = await client.rpc(
        "moderate_profile_comment",
        {
          target_comment: removal.commentId,
          reason: clean,
          target_report: removal.reportId,
        },
      );
      if (removalError || data !== true) {
        setError(
          tri(
            lang,
            "Não foi possível remover o comentário.",
            "Could not remove the comment.",
            "No se pudo quitar el comentario.",
          ),
        );
      } else {
        setCommentRows((current) =>
          current.map((comment) =>
            comment.id === removal.commentId
              ? { ...comment, body: "", deleted_at: new Date().toISOString() }
              : comment,
          ),
        );
        setReportRows((current) =>
          current.map((report) =>
            report.id === removal.reportId
              ? {
                  ...report,
                  status: "RESOLVED",
                  moderator_note: clean ?? report.moderator_note,
                }
              : report,
          ),
        );
        setRemoval(null);
        setRemovalReason("");
      }
    } else {
      setPending(`screenshot-${removal.screenshotId}`);
      setError(null);
      const { data, error: removalError } = await client.rpc(
        "moderate_screenshot",
        {
          target_screenshot: removal.screenshotId,
          reason: clean,
          target_report: removal.reportId,
        },
      );
      if (removalError || data !== true) {
        setError(
          tri(
            lang,
            "Não foi possível remover o screenshot.",
            "Could not remove the screenshot.",
            "No se pudo quitar la captura.",
          ),
        );
      } else {
        setScreenshotRows((current) =>
          current.map((shot) =>
            shot.id === removal.screenshotId
              ? {
                  ...shot,
                  description: null,
                  deletedAt: new Date().toISOString(),
                  imageUrl: null,
                }
              : shot,
          ),
        );
        setReportRows((current) =>
          current.map((report) =>
            report.id === removal.reportId
              ? {
                  ...report,
                  status: "RESOLVED",
                  moderator_note: clean ?? report.moderator_note,
                }
              : report,
          ),
        );
        setRemoval(null);
        setRemovalReason("");
      }
    }
    setPending(null);
  }

  return (
    <main className="moderation-page">
      <header className="moderation-hero">
        <span>
          <ShieldCheck size={18} />
        </span>
        <div>
          <small>
            {tri(lang, "ÁREA INTERNA", "INTERNAL AREA", "ÁREA INTERNA")}
          </small>
          <h1>
            {tri(
              lang,
              "Central de moderação",
              "Moderation center",
              "Centro de moderación",
            )}
          </h1>
          <p>
            {tri(
              lang,
              "Analise denúncias, proteja a comunidade e mantenha toda decisão auditável.",
              "Review reports, protect the community, and keep every decision auditable.",
              "Revisa denuncias, protege la comunidad y mantén cada decisión auditable.",
            )}
          </p>
        </div>
        <strong>{actorRole}</strong>
      </header>

      {error && !dialogOpen && (
        <p className="moderation-error" role="alert">
          {error}
        </p>
      )}

      <section className="moderation-section">
        <header>
          <div>
            <h2>
              {tri(
                lang,
                "Fila de denúncias",
                "Report queue",
                "Cola de denuncias",
              )}
            </h2>
            <p>
              {reportRows.length}{" "}
              {tri(
                lang,
                "registro(s) neste filtro",
                "record(s) in this filter",
                "registro(s) en este filtro",
              )}
            </p>
          </div>
          <nav
            className="game-page-nav moderation-status-tabs"
            role="tablist"
            aria-label={tri(
              lang,
              "Filtrar denúncias",
              "Filter reports",
              "Filtrar denuncias",
            )}
          >
            {statusTabs.map(({ id, label, icon: Icon }, index) => {
              const count = statusCounts[id];
              return (
                <button
                  type="button"
                  role="tab"
                  key={id}
                  aria-selected={initialStatus === id}
                  tabIndex={initialStatus === id ? 0 : -1}
                  onClick={() => setStatus(id)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const nextIndex =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? statusTabs.length - 1
                          : (index +
                              (event.key === "ArrowRight" ? 1 : -1) +
                              statusTabs.length) %
                            statusTabs.length;
                    setStatus(statusTabs[nextIndex].id);
                  }}
                >
                  <Icon size={15} />
                  {label}
                  {typeof count === "number" && count > 0 && (
                    <b className="moderation-tab-count">{count}</b>
                  )}
                </button>
              );
            })}
          </nav>
        </header>
        <div className="moderation-report-list">
          {reportRows.length === 0 && (
            <div className="moderation-empty">
              <Check size={22} />
              {tri(
                lang,
                "Nenhuma denúncia neste estado.",
                "No reports here.",
                "Ninguna denuncia en este estado.",
              )}
            </div>
          )}
          {reportRows.map((report) => {
            const target = report.target_profile_id
              ? profileById.get(report.target_profile_id)
              : undefined;
            const reporter = profileById.get(report.reporter_id);
            const comment = report.content_id
              ? commentById.get(report.content_id)
              : undefined;
            const shot = report.content_id
              ? screenshotById.get(report.content_id)
              : undefined;
            return (
              <article className="moderation-report-card" key={report.id}>
                <header>
                  <span>
                    <Flag size={14} /> {report.reason.replaceAll("_", " ")}
                  </span>
                  <RelativeTime value={report.created_at} lang={lang} />
                </header>
                <div className="moderation-report-people">
                  <span>
                    {tri(lang, "Alvo", "Target", "Objetivo")}:{" "}
                    <strong>{profileName(target)}</strong>
                  </span>
                  <span>
                    {tri(lang, "Enviado por", "Reported by", "Enviado por")}:{" "}
                    <strong>{profileName(reporter)}</strong>
                  </span>
                  <b>{report.content_type || "PROFILE"}</b>
                </div>
                {comment && (
                  <blockquote data-deleted={comment.deleted_at || undefined}>
                    {comment.deleted_at
                      ? tri(
                          lang,
                          "Comentário removido",
                          "Deleted comment",
                          "Comentario eliminado",
                        )
                      : comment.body}
                  </blockquote>
                )}
                {shot && (
                  <div
                    className="moderation-report-screenshot"
                    data-deleted={shot.deletedAt || undefined}
                  >
                    {shot.deletedAt ? (
                      <p>
                        <Camera size={14} />
                        {tri(
                          lang,
                          "Screenshot removido",
                          "Screenshot removed",
                          "Captura eliminada",
                        )}
                      </p>
                    ) : shot.imageUrl ? (
                      <Image
                        src={shot.imageUrl}
                        alt=""
                        width={Math.min(shot.width, 480)}
                        height={Math.round(
                          (shot.height / shot.width) * Math.min(shot.width, 480),
                        )}
                        unoptimized
                      />
                    ) : (
                      <p>
                        <Camera size={14} />
                        {tri(
                          lang,
                          "Prévia indisponível",
                          "Preview unavailable",
                          "Vista previa no disponible",
                        )}
                      </p>
                    )}
                    {shot.description && !shot.deletedAt && (
                      <blockquote>{shot.description}</blockquote>
                    )}
                    {shot.containsSpoilers && !shot.deletedAt && (
                      <small className="moderation-report-flag">
                        {tri(
                          lang,
                          "Contém spoilers",
                          "Contains spoilers",
                          "Contiene spoilers",
                        )}
                      </small>
                    )}
                  </div>
                )}
                {report.details && <p>{report.details}</p>}
                {report.target_profile_id && target?.username && (
                  <Link href={`/${lang}/u/${target.username}`} target="_blank">
                    {tri(lang, "Abrir perfil", "Open profile", "Abrir perfil")}{" "}
                    <ExternalLink size={12} />
                  </Link>
                )}
                <textarea
                  value={notes[report.id] ?? report.moderator_note ?? ""}
                  maxLength={1000}
                  aria-label={tri(
                    lang,
                    "Nota interna da decisão",
                    "Internal decision note",
                    "Nota interna de la decisión",
                  )}
                  placeholder={tri(
                    lang,
                    "Nota interna da decisão…",
                    "Internal decision note…",
                    "Nota interna de la decisión…",
                  )}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                />
                <footer>
                  {report.content_type === "PROFILE_COMMENT" &&
                    comment &&
                    !comment.deleted_at && (
                      <button
                        type="button"
                        data-danger
                        disabled={Boolean(pending)}
                        onClick={() =>
                          openRemoval({
                            kind: "COMMENT",
                            reportId: report.id,
                            commentId: comment.id,
                          })
                        }
                      >
                        <MessageSquareOff size={13} />
                        {t.removeComment}
                      </button>
                    )}
                  {report.content_type === "SCREENSHOT" &&
                    shot &&
                    !shot.deletedAt && (
                      <button
                        type="button"
                        data-danger
                        disabled={Boolean(pending)}
                        onClick={() =>
                          openRemoval({
                            kind: "SCREENSHOT",
                            reportId: report.id,
                            screenshotId: shot.id,
                          })
                        }
                      >
                        <Trash2 size={13} />
                        {tri(
                          lang,
                          "Remover screenshot",
                          "Remove screenshot",
                          "Quitar captura",
                        )}
                      </button>
                    )}
                  {report.status !== "REVIEWING" && (
                    <button
                      type="button"
                      disabled={Boolean(pending)}
                      onClick={() => void updateReport(report.id, "REVIEWING")}
                    >
                      {pending === `report-${report.id}-REVIEWING` ? (
                        <LoaderCircle className="spin" size={13} />
                      ) : (
                        <Clock3 size={13} />
                      )}
                      {tri(
                        lang,
                        "Assumir análise",
                        "Start review",
                        "Tomar la revisión",
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(pending)}
                    onClick={() => void updateReport(report.id, "DISMISSED")}
                  >
                    {pending === `report-${report.id}-DISMISSED` ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      <X size={13} />
                    )}
                    {tri(lang, "Descartar", "Dismiss", "Descartar")}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(pending)}
                    onClick={() => void updateReport(report.id, "RESOLVED")}
                  >
                    {pending === `report-${report.id}-RESOLVED` ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    {tri(lang, "Resolver", "Resolve", "Resolver")}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      <section className="moderation-section">
        <header>
          <div>
            <h2>
              {tri(
                lang,
                "Gerenciar usuários",
                "Manage users",
                "Gestionar usuarios",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Busque pelo @ ou nome de exibição.",
                "Search by handle or display name.",
                "Busca por @ o nombre visible.",
              )}
            </p>
          </div>
          <form
            className="moderation-search"
            onSubmit={(event) => void searchAccounts(event)}
          >
            <label className="search-field-hit">
              <Search size={15} />
              <input
                name="q"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                minLength={2}
                maxLength={32}
                aria-label={tri(
                  lang,
                  "Buscar usuário",
                  "Search user",
                  "Buscar usuario",
                )}
                placeholder={tri(
                  lang,
                  "Buscar usuário",
                  "Search user",
                  "Buscar usuario",
                )}
              />
            </label>
            <button
              type="button"
              className="moderation-search-clear"
              data-hidden={!search ? true : undefined}
              aria-label={t.clearSearch}
              onClick={() => {
                setSearch("");
                setAccountRows(accounts);
                setError(null);
              }}
            >
              <X size={14} />
            </button>
            <button disabled={searching || search.trim().length < 2}>
              {searching && <LoaderCircle className="spin" size={13} />}
              {t.search}
            </button>
          </form>
        </header>
        <div className="moderation-user-grid">
          {search.trim().length >= 2 && accountRows.length === 0 && (
            <div className="moderation-empty">
              {tri(
                lang,
                "Nenhum usuário encontrado.",
                "No users found.",
                "No se encontraron usuarios.",
              )}
            </div>
          )}
          {accountRows.map((profile) => {
            const state = stateByProfile.get(profile.id);
            const banned = Boolean(
              state &&
                (!state.banned_until ||
                  new Date(state.banned_until).getTime() > renderedAt),
            );
            const protectedTarget =
              profile.role === "ADMIN" ||
              (actorRole === "MODERATOR" && profile.role !== "USER");
            return (
              <article className="moderation-user-card" key={profile.id}>
                <div>
                  <span className="moderation-user-avatar">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt="" />
                    ) : (
                      (profile.display_name || profile.username || "?")
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </span>
                  <p>
                    <strong>
                      {profileName(profile)}
                      {profile.verified && <VerifiedMark size={15} />}
                    </strong>
                    <span>@{profile.username}</span>
                    <small>
                      {profile.role}
                      {banned
                        ? ` · ${tri(lang, "BANIDO", "BANNED", "BANEADO")}`
                        : ""}
                    </small>
                  </p>
                </div>
                {state && <blockquote>{state.reason}</blockquote>}
                <footer>
                  <Link href={`/${lang}/u/${profile.username}`}>
                    {tri(lang, "Perfil", "Profile", "Perfil")}
                  </Link>
                  {!protectedTarget && (
                    <>
                      <button
                        type="button"
                        disabled={Boolean(pending)}
                        onClick={() =>
                          openProfileAction(
                            profile,
                            profile.verified ? "UNVERIFY" : "VERIFY",
                          )
                        }
                      >
                        {profile.verified ? (
                          <ShieldOff size={13} />
                        ) : (
                          <VerifiedMark size={13} />
                        )}
                        {profile.verified
                          ? tri(
                              lang,
                              "Retirar selo",
                              "Unverify",
                              "Quitar verificación",
                            )
                          : tri(lang, "Verificar", "Verify", "Verificar")}
                      </button>
                      <button
                        type="button"
                        data-danger
                        disabled={Boolean(pending)}
                        onClick={() =>
                          openProfileAction(profile, banned ? "UNBAN" : "BAN")
                        }
                      >
                        <Ban size={13} />
                        {banned
                          ? tri(lang, "Desbanir", "Unban", "Desbanear")
                          : tri(lang, "Banir", "Ban", "Banear")}
                      </button>
                    </>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      <section className="moderation-section moderation-audit">
        <header>
          <div>
            <h2>
              {tri(
                lang,
                "Auditoria recente",
                "Recent audit log",
                "Auditoría reciente",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Registro imutável das decisões.",
                "Immutable decisions log.",
                "Registro inmutable de las decisiones.",
              )}
            </p>
          </div>
        </header>
        {actions.length === 0 && (
          <div className="moderation-empty">
            {tri(
              lang,
              "Nenhuma decisão registrada.",
              "No decisions recorded yet.",
              "Ninguna decisión registrada.",
            )}
          </div>
        )}
        <ol>
          {actions.map((action) => (
            <li key={action.id}>
              <ShieldCheck size={14} />
              <span>
                <strong>{action.action.replaceAll("_", " ")}</strong>
                {action.reason && <p>{action.reason}</p>}
                <small>
                  {profileName(profileById.get(action.moderator_id))} ·{" "}
                  <RelativeTime value={action.created_at} lang={lang} />
                </small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <Dialog.Root
        open={Boolean(targetAction)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setTargetAction(null);
            setReason("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="moderation-dialog-overlay" />
          <Dialog.Content className="moderation-dialog">
            <Dialog.Close aria-label={t.close}>
              <X size={17} />
            </Dialog.Close>
            <span>
              {targetAction?.action === "BAN" ||
              targetAction?.action === "UNBAN" ? (
                <Ban size={20} />
              ) : (
                <VerifiedMark size={20} />
              )}
            </span>
            <Dialog.Title>
              {targetAction
                ? `${targetAction.action} · ${profileName(targetAction.profile)}`
                : ""}
            </Dialog.Title>
            <Dialog.Description>
              {tri(
                lang,
                "Esta decisão será registrada permanentemente na auditoria.",
                "This decision will be permanently recorded in the audit log.",
                "Esta decisión quedará registrada permanentemente en la auditoría.",
              )}
            </Dialog.Description>
            {targetAction?.action === "BAN" && (
              <div className="moderation-field">
                <span id="moderation-duration-label">
                  {tri(lang, "Duração", "Duration", "Duración")}
                </span>
                <Select.Root value={duration} onValueChange={setDuration}>
                  <Select.Trigger
                    id="moderation-duration-trigger"
                    className="moderation-select-trigger"
                    aria-labelledby="moderation-duration-label moderation-duration-trigger"
                  >
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="moderation-select-content"
                      position="popper"
                      sideOffset={6}
                      collisionPadding={12}
                    >
                      <Select.Viewport>
                        {[
                          ...MODERATION_BAN_DURATIONS.map(({ value, days }) => [
                            value,
                            tri(
                              lang,
                              `${days} ${days === 1 ? "dia" : "dias"}`,
                              `${days} ${days === 1 ? "day" : "days"}`,
                              `${days} ${days === 1 ? "día" : "días"}`,
                            ),
                          ] as const),
                          ...(actorRole === "ADMIN"
                            ? ([
                                [
                                  "permanent",
                                  tri(
                                    lang,
                                    "Permanente",
                                    "Permanent",
                                    "Permanente",
                                  ),
                                ] as const,
                              ] as const)
                            : []),
                        ].map(([value, label]) => (
                          <Select.Item
                            className="moderation-select-item"
                            value={value}
                            key={value}
                          >
                            <Select.ItemText>{label}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check size={13} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
            <label>
              {tri(
                lang,
                "Motivo / nota interna",
                "Reason / internal note",
                "Motivo / nota interna",
              )}
              <textarea
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                placeholder={tri(
                  lang,
                  "Descreva a justificativa…",
                  "Describe the rationale…",
                  "Describe la justificación…",
                )}
              />
            </label>
            {needsReason && reason.trim().length < 3 && (
              <p className="moderation-dialog-hint">
                {tri(
                  lang,
                  "O motivo é obrigatório e precisa de pelo menos 3 caracteres.",
                  "A reason is required and must be at least 3 characters.",
                  "El motivo es obligatorio y necesita al menos 3 caracteres.",
                )}
              </p>
            )}
            {error && (
              <p className="moderation-dialog-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <Dialog.Close disabled={Boolean(pending)}>
                {t.cancel}
              </Dialog.Close>
              <button
                type="button"
                disabled={
                  Boolean(pending) || (needsReason && reason.trim().length < 3)
                }
                onClick={() => void performProfileAction()}
              >
                {profilePending && <LoaderCircle className="spin" size={14} />}
                {profilePending
                  ? t.applying
                  : tri(
                      lang,
                      "Confirmar ação",
                      "Confirm action",
                      "Confirmar acción",
                    )}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(removal)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setRemoval(null);
            setRemovalReason("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="moderation-dialog-overlay" />
          <Dialog.Content className="moderation-dialog">
            <Dialog.Close aria-label={t.close}>
              <X size={17} />
            </Dialog.Close>
            <span>
              {removal?.kind === "SCREENSHOT" ? (
                <Camera size={20} />
              ) : (
                <MessageSquareOff size={20} />
              )}
            </span>
            <Dialog.Title>
              {removal?.kind === "SCREENSHOT"
                ? tri(
                    lang,
                    "Remover screenshot",
                    "Remove screenshot",
                    "Quitar captura",
                  )
                : t.removeComment}
            </Dialog.Title>
            <Dialog.Description>
              {tri(
                lang,
                "O autor será notificado e esta decisão ficará registrada na auditoria.",
                "The author will be notified and this decision will remain in the audit log.",
                "Se notificará al autor y esta decisión quedará en la auditoría.",
              )}
            </Dialog.Description>
            <label>
              {tri(
                lang,
                "Justificativa (opcional)",
                "Reason (optional)",
                "Justificación (opcional)",
              )}
              <textarea
                value={removalReason}
                maxLength={1000}
                onChange={(event) => setRemovalReason(event.target.value)}
                placeholder={tri(
                  lang,
                  "Explique por que o conteúdo foi removido…",
                  "Explain why the content was removed…",
                  "Explica por qué se eliminó el contenido…",
                )}
              />
            </label>
            {error && (
              <p className="moderation-dialog-error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <Dialog.Close disabled={Boolean(pending)}>
                {t.cancel}
              </Dialog.Close>
              <button
                type="button"
                data-danger
                disabled={Boolean(pending)}
                onClick={() => void performRemoval()}
              >
                {removalPending && <LoaderCircle className="spin" size={14} />}
                {removalPending ? t.removing : t.remove}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
