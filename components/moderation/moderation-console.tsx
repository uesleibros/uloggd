"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeCheck,
  Ban,
  Check,
  Clock3,
  ExternalLink,
  Flag,
  LoaderCircle,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRoundCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
type ProfileAction = "BAN" | "UNBAN" | "VERIFY" | "UNVERIFY";

export function ModerationConsole({
  lang,
  actorRole,
  initialStatus,
  initialSearch,
  reports,
  accounts,
  profiles,
  comments,
  moderationStates,
  actions,
}: {
  lang: "pt-BR" | "en";
  actorRole: "MODERATOR" | "ADMIN";
  initialStatus: string;
  initialSearch: string;
  reports: Report[];
  accounts: Profile[];
  profiles: Profile[];
  comments: { id: string; body: string; deleted_at: string | null }[];
  moderationStates: ModerationState[];
  actions: Action[];
}) {
  const pt = lang === "pt-BR";
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [targetAction, setTargetAction] = useState<{
    profile: Profile;
    action: ProfileAction;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [renderedAt] = useState(() => Date.now());
  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const commentById = useMemo(
    () => new Map(comments.map((comment) => [comment.id, comment])),
    [comments],
  );
  const stateByProfile = useMemo(
    () => new Map(moderationStates.map((state) => [state.profile_id, state])),
    [moderationStates],
  );

  function profileName(profile: Profile | undefined) {
    return profile?.display_name || `@${profile?.username ?? "usuário"}`;
  }

  function setStatus(status: string) {
    const params = new URLSearchParams();
    params.set("status", status);
    if (initialSearch) params.set("q", initialSearch);
    router.replace(`${pathname}?${params.toString()}`);
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
        pt
          ? "Não foi possível atualizar a denúncia."
          : "Could not update the report.",
      );
    else router.refresh();
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
        pt
          ? "A ação foi recusada. Verifique sua permissão e o motivo."
          : "The action was refused. Check your permission and reason.",
      );
    else {
      setTargetAction(null);
      setReason("");
      router.refresh();
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
          <small>{pt ? "ÁREA INTERNA" : "INTERNAL AREA"}</small>
          <h1>{pt ? "Central de moderação" : "Moderation center"}</h1>
          <p>
            {pt
              ? "Analise denúncias, proteja a comunidade e mantenha toda decisão auditável."
              : "Review reports, protect the community, and keep every decision auditable."}
          </p>
        </div>
        <strong>{actorRole}</strong>
      </header>

      {error && (
        <p className="moderation-error" role="alert">
          {error}
        </p>
      )}

      <section className="moderation-section">
        <header>
          <div>
            <h2>{pt ? "Fila de denúncias" : "Report queue"}</h2>
            <p>
              {reports.length}{" "}
              {pt ? "registro(s) neste filtro" : "record(s) in this filter"}
            </p>
          </div>
          <nav aria-label={pt ? "Filtrar denúncias" : "Filter reports"}>
            {["OPEN", "REVIEWING", "RESOLVED", "DISMISSED", "ALL"].map(
              (status) => (
                <button
                  type="button"
                  key={status}
                  aria-pressed={initialStatus === status}
                  onClick={() => setStatus(status)}
                >
                  {status}
                </button>
              ),
            )}
          </nav>
        </header>
        <div className="moderation-report-list">
          {reports.length === 0 && (
            <div className="moderation-empty">
              <Check size={22} />
              {pt ? "Nenhuma denúncia neste estado." : "No reports here."}
            </div>
          )}
          {reports.map((report) => {
            const target = report.target_profile_id
              ? profileById.get(report.target_profile_id)
              : undefined;
            const reporter = profileById.get(report.reporter_id);
            const comment = report.content_id
              ? commentById.get(report.content_id)
              : undefined;
            return (
              <article className="moderation-report-card" key={report.id}>
                <header>
                  <span>
                    <Flag size={14} /> {report.reason.replaceAll("_", " ")}
                  </span>
                  <time dateTime={report.created_at}>
                    {new Intl.DateTimeFormat(lang, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(report.created_at))}
                  </time>
                </header>
                <div className="moderation-report-people">
                  <span>
                    {pt ? "Alvo" : "Target"}:{" "}
                    <strong>{profileName(target)}</strong>
                  </span>
                  <span>
                    {pt ? "Enviado por" : "Reported by"}:{" "}
                    <strong>{profileName(reporter)}</strong>
                  </span>
                  <b>{report.content_type || "PROFILE"}</b>
                </div>
                {comment && (
                  <blockquote data-deleted={comment.deleted_at || undefined}>
                    {comment.deleted_at
                      ? pt
                        ? "Comentário removido"
                        : "Deleted comment"
                      : comment.body}
                  </blockquote>
                )}
                {report.details && <p>{report.details}</p>}
                {report.target_profile_id && target?.username && (
                  <Link href={`/${lang}/u/${target.username}`} target="_blank">
                    {pt ? "Abrir perfil" : "Open profile"}{" "}
                    <ExternalLink size={12} />
                  </Link>
                )}
                <textarea
                  value={notes[report.id] ?? report.moderator_note ?? ""}
                  maxLength={1000}
                  placeholder={
                    pt ? "Nota interna da decisão…" : "Internal decision note…"
                  }
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                />
                <footer>
                  {report.status !== "REVIEWING" && (
                    <button
                      type="button"
                      disabled={Boolean(pending)}
                      onClick={() => void updateReport(report.id, "REVIEWING")}
                    >
                      <Clock3 size={13} />{" "}
                      {pt ? "Assumir análise" : "Start review"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(pending)}
                    onClick={() => void updateReport(report.id, "DISMISSED")}
                  >
                    <X size={13} /> {pt ? "Descartar" : "Dismiss"}
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
                    {pt ? "Resolver" : "Resolve"}
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
            <h2>{pt ? "Gerenciar usuários" : "Manage users"}</h2>
            <p>
              {pt
                ? "Busque pelo @ ou nome de exibição."
                : "Search by handle or display name."}
            </p>
          </div>
          <form className="moderation-search">
            <Search size={15} />
            <input
              name="q"
              defaultValue={initialSearch}
              minLength={2}
              maxLength={32}
              placeholder={pt ? "Buscar usuário" : "Search user"}
            />
            <input type="hidden" name="status" value={initialStatus} />
            <button>{pt ? "Buscar" : "Search"}</button>
          </form>
        </header>
        <div className="moderation-user-grid">
          {initialSearch.length >= 2 && accounts.length === 0 && (
            <div className="moderation-empty">
              {pt ? "Nenhum usuário encontrado." : "No users found."}
            </div>
          )}
          {accounts.map((profile) => {
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
                      {profile.verified && <BadgeCheck size={14} />}
                    </strong>
                    <span>@{profile.username}</span>
                    <small>
                      {profile.role}
                      {banned ? ` · ${pt ? "BANIDO" : "BANNED"}` : ""}
                    </small>
                  </p>
                </div>
                {state && <blockquote>{state.reason}</blockquote>}
                <footer>
                  <Link href={`/${lang}/u/${profile.username}`}>
                    {pt ? "Perfil" : "Profile"}
                  </Link>
                  {!protectedTarget && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setTargetAction({
                            profile,
                            action: profile.verified ? "UNVERIFY" : "VERIFY",
                          })
                        }
                      >
                        {profile.verified ? (
                          <ShieldOff size={13} />
                        ) : (
                          <UserRoundCheck size={13} />
                        )}
                        {profile.verified
                          ? pt
                            ? "Retirar selo"
                            : "Unverify"
                          : pt
                            ? "Verificar"
                            : "Verify"}
                      </button>
                      <button
                        type="button"
                        data-danger
                        onClick={() =>
                          setTargetAction({
                            profile,
                            action: banned ? "UNBAN" : "BAN",
                          })
                        }
                      >
                        <Ban size={13} />
                        {banned
                          ? pt
                            ? "Desbanir"
                            : "Unban"
                          : pt
                            ? "Banir"
                            : "Ban"}
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
            <h2>{pt ? "Auditoria recente" : "Recent audit log"}</h2>
            <p>
              {pt
                ? "Registro imutável das decisões."
                : "Immutable decisions log."}
            </p>
          </div>
        </header>
        <ol>
          {actions.map((action) => (
            <li key={action.id}>
              <ShieldCheck size={14} />
              <span>
                <strong>{action.action.replaceAll("_", " ")}</strong>
                {action.reason && <p>{action.reason}</p>}
                <small>
                  {profileName(profileById.get(action.moderator_id))} ·{" "}
                  {new Intl.DateTimeFormat(lang, {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(action.created_at))}
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
            <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
              <X size={17} />
            </Dialog.Close>
            <span>
              {targetAction?.action === "BAN" ||
              targetAction?.action === "UNBAN" ? (
                <Ban size={20} />
              ) : (
                <BadgeCheck size={20} />
              )}
            </span>
            <Dialog.Title>
              {targetAction
                ? `${targetAction.action} · ${profileName(targetAction.profile)}`
                : ""}
            </Dialog.Title>
            <Dialog.Description>
              {pt
                ? "Esta decisão será registrada permanentemente na auditoria."
                : "This decision will be permanently recorded in the audit log."}
            </Dialog.Description>
            {targetAction?.action === "BAN" && (
              <label>
                {pt ? "Duração" : "Duration"}
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="1">{pt ? "1 dia" : "1 day"}</option>
                  <option value="7">{pt ? "7 dias" : "7 days"}</option>
                  <option value="30">{pt ? "30 dias" : "30 days"}</option>
                  {actorRole === "ADMIN" && (
                    <option value="permanent">
                      {pt ? "Permanente" : "Permanent"}
                    </option>
                  )}
                </select>
              </label>
            )}
            <label>
              {pt ? "Motivo / nota interna" : "Reason / internal note"}
              <textarea
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  pt ? "Descreva a justificativa…" : "Describe the rationale…"
                }
              />
            </label>
            <footer>
              <Dialog.Close disabled={Boolean(pending)}>
                {pt ? "Cancelar" : "Cancel"}
              </Dialog.Close>
              <button
                type="button"
                disabled={
                  Boolean(pending) ||
                  ((targetAction?.action === "BAN" ||
                    targetAction?.action === "UNBAN") &&
                    reason.trim().length < 3)
                }
                onClick={() => void performProfileAction()}
              >
                {pending && <LoaderCircle className="spin" size={14} />}
                {pending
                  ? pt
                    ? "Aplicando…"
                    : "Applying…"
                  : pt
                    ? "Confirmar ação"
                    : "Confirm action"}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
