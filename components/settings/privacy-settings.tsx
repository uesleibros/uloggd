"use client";

import {
  Check,
  Eye,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Search,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SiTwitch } from "react-icons/si";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { SearchSubmit } from "@/components/search-submit";
import { tri, uiText } from "@/lib/ui-text";
import type { UiLang } from "@/lib/ui-text";

type Scope = "EVERYONE" | "FOLLOWERS" | "NOBODY";
type Visibility = "EVERYONE" | "FOLLOWERS";
type BlockedProfile = {
  id: string;
  username: string;
  display_name: string | null;
};
export type FollowRequest = BlockedProfile & { avatar_url: string | null };

/** One picker for all three scopes, so they cannot drift apart. */
function ScopePicker<T extends string>({
  value,
  options,
  disabled,
  onPick,
}: {
  value: T;
  options: Array<[T, string]>;
  disabled: boolean;
  onPick: (next: T) => void;
}) {
  return (
    <div className="privacy-scope-options" role="radiogroup">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          disabled={disabled}
          onClick={() => onPick(option)}
        >
          <span>{label}</span>
          <i aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function PrivacySettings({
  initialScope,
  initialContentScope,
  initialVisibility,
  initialPrivate,
  initialTwitchUsername,
  initialTwitchLive,
  initialRequests,
  initialBlocked,
  requestTotal,
  blockedTotal,
  viewerId,
  lang,
}: {
  initialScope: Scope;
  initialContentScope: Scope;
  initialVisibility: Visibility;
  initialPrivate: boolean;
  /** Null when no Twitch account is linked, which is what hides the card. */
  initialTwitchUsername: string | null;
  initialTwitchLive: boolean;
  initialRequests: FollowRequest[];
  initialBlocked: BlockedProfile[];
  requestTotal: number;
  blockedTotal: number;
  /**
   * The follow request read policy admits both participants, so a query
   * without this filter would fold the viewer's own outgoing requests into
   * the list of requests they received.
   */
  viewerId: string;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [scope, setScope] = useState(initialScope);
  const [contentScope, setContentScope] = useState(initialContentScope);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [twitchLive, setTwitchLive] = useState(initialTwitchLive);
  const [requests, setRequests] = useState(initialRequests);
  const [blocked, setBlocked] = useState(initialBlocked);
  // Both lists are paged from the server. Someone with hundreds of blocks
  // used to have every row loaded into the settings page at once, and there
  // was no way to find one account among them.
  const [requestQuery, setRequestQuery] = useState("");
  const [blockedQuery, setBlockedQuery] = useState("");
  const [requestCount, setRequestCount] = useState(requestTotal);
  const [blockedCount, setBlockedCount] = useState(blockedTotal);
  const [loadingList, setLoadingList] = useState<"requests" | "blocked" | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const PAGE = 20;

  /**
   * Fetches a page of either list. `!inner` on the joined profile is what lets
   * the search filter the parent rows: without it PostgREST would return every
   * block or request and merely narrow the embedded profile.
   */
  async function loadList(
    list: "requests" | "blocked",
    query: string,
    offset: number,
  ) {
    const client = createClient();
    const term = query.trim().replace(/[%,()]/g, "");
    const table = list === "requests" ? "follow_requests" : "blocks";
    const alias = list === "requests" ? "requester" : "blocked";
    const fk =
      list === "requests"
        ? "follow_requests_requester_id_fkey"
        : "blocks_blocked_id_fkey";
    const columns =
      list === "requests"
        ? "id,username,display_name,avatar_url"
        : "id,username,display_name";
    const ownerColumn = list === "requests" ? "target_id" : "blocker_id";

    let request = client
      .from(table)
      .select(`${alias}:profiles!${fk}!inner(${columns})`, { count: "exact" })
      .eq(ownerColumn, viewerId)
      .order("created_at", { ascending: false });
    if (term)
      request = request.or(
        `username.ilike.%${term}%,display_name.ilike.%${term}%`,
        { referencedTable: alias },
      );
    const { data, count, error } = await request.range(
      offset,
      offset + PAGE - 1,
    );
    if (error) return null;
    const rows = (data ?? []).flatMap((row: Record<string, unknown>) => {
      const person = Array.isArray(row[alias]) ? row[alias][0] : row[alias];
      return person?.username ? [person] : [];
    });
    return { rows, count: count ?? 0 };
  }

  async function searchList(list: "requests" | "blocked", query: string) {
    setLoadingList(list);
    const result = await loadList(list, query, 0);
    if (result) {
      if (list === "requests") {
        setRequests(result.rows as FollowRequest[]);
        setRequestCount(result.count);
      } else {
        setBlocked(result.rows as BlockedProfile[]);
        setBlockedCount(result.count);
      }
    }
    setLoadingList(null);
  }

  async function loadMore(list: "requests" | "blocked") {
    setLoadingList(list);
    const current = list === "requests" ? requests : blocked;
    const result = await loadList(
      list,
      list === "requests" ? requestQuery : blockedQuery,
      current.length,
    );
    if (result) {
      if (list === "requests") {
        setRequests((rows) => [...rows, ...(result.rows as FollowRequest[])]);
        setRequestCount(result.count);
      } else {
        setBlocked((rows) => [...rows, ...(result.rows as BlockedProfile[])]);
        setBlockedCount(result.count);
      }
    }
    setLoadingList(null);
  }

  async function updateContentScope(next: Scope) {
    if (pending) return;
    const previous = contentScope;
    setContentScope(next);
    setPending("contentScope");
    setMessage(null);
    const { error } = await createClient().rpc("set_privacy_scopes", {
      comment_scope: next,
      visibility: null,
    });
    if (error) {
      setContentScope(previous);
      setMessage(t.couldNotSave);
    }
    setPending(null);
  }

  async function updateVisibility(next: Visibility) {
    if (pending) return;
    const previous = visibility;
    setVisibility(next);
    setPending("visibility");
    setMessage(null);
    const { error } = await createClient().rpc("set_privacy_scopes", {
      comment_scope: null,
      visibility: next,
    });
    if (error) {
      setVisibility(previous);
      setMessage(t.couldNotSave);
    }
    setPending(null);
  }

  async function updateTwitchLive(next: boolean) {
    if (pending) return;
    const previous = twitchLive;
    setTwitchLive(next);
    setPending("twitch-live");
    setMessage(null);
    const { error } = await createClient().rpc("set_twitch_live_visible", {
      visible: next,
    });
    if (error) {
      setTwitchLive(previous);
      setMessage(t.couldNotSave);
    }
    setPending(null);
  }

  async function updatePrivacy(next: boolean) {
    if (pending) return;
    const previous = isPrivate;
    setIsPrivate(next);
    setPending("privacy");
    setMessage(null);
    const { error } = await createClient().rpc("set_profile_privacy", {
      private: next,
    });
    if (error) {
      setIsPrivate(previous);
      setMessage(t.couldNotSave);
    } else if (!next) {
      // Opening the account approves whatever was waiting, so the queue empties.
      setRequests([]);
    }
    setPending(null);
  }

  async function reviewRequest(id: string, approve: boolean) {
    if (pending) return;
    setPending(`request-${id}`);
    setMessage(null);
    const { error } = await createClient().rpc("review_follow_request", {
      requester: id,
      approve,
    });
    if (error)
      setMessage(
        tri(
          lang,
          "Não foi possível responder.",
          "Could not respond.",
          "No se pudo responder.",
        ),
      );
    else setRequests((current) => current.filter((item) => item.id !== id));
    setPending(null);
  }

  async function updateScope(next: Scope) {
    if (pending) return;
    const previous = scope;
    setScope(next);
    setPending("scope");
    setMessage(null);
    const { error } = await createClient().rpc("set_profile_comment_scope", {
      new_scope: next,
    });
    if (error) {
      setScope(previous);
      setMessage(t.couldNotSave);
    }
    setPending(null);
  }

  async function unblock(profile: BlockedProfile) {
    if (pending) return;
    setPending(profile.id);
    setMessage(null);
    const { error } = await createClient().rpc("unblock_profile", {
      target_profile: profile.id,
    });
    if (error)
      setMessage(
        tri(
          lang,
          "Não foi possível desbloquear.",
          "Could not unblock.",
          "No se pudo desbloquear.",
        ),
      );
    else
      setBlocked((current) => current.filter((item) => item.id !== profile.id));
    setPending(null);
  }

  return (
    <div className="settings-privacy-stack">
      <section className="settings-security-card settings-privacy-card">
        <header>
          <span>
            <LockKeyhole size={20} />
          </span>
          <div>
            <h2>
              {tri(lang, "Conta privada", "Private account", "Cuenta privada")}
            </h2>
            <p>
              {tri(
                lang,
                "Com a conta privada, quem quiser te seguir precisa da sua aprovação. Quem já segue continua seguindo.",
                "With a private account, anyone who wants to follow you needs your approval. Current followers stay.",
                "Con la cuenta privada, quien quiera seguirte necesita tu aprobación. Quien ya te sigue continúa.",
              )}
            </p>
          </div>
        </header>
        <div className="privacy-toggle">
          <Switch
            checked={isPrivate}
            disabled={Boolean(pending)}
            aria-label={tri(
              lang,
              "Conta privada",
              "Private account",
              "Cuenta privada",
            )}
            onCheckedChange={(checked) => void updatePrivacy(checked)}
          />
          <span>
            {isPrivate
              ? tri(
                  lang,
                  "Sua conta está privada",
                  "Your account is private",
                  "Tu cuenta está privada",
                )
              : tri(
                  lang,
                  "Sua conta está pública",
                  "Your account is public",
                  "Tu cuenta está pública",
                )}
          </span>
          {pending === "privacy" && (
            <LoaderCircle className="spin" size={14} aria-hidden />
          )}
        </div>

        {isPrivate && (
          <div className="privacy-requests">
            <h3>
              {tri(
                lang,
                "Solicitações para seguir",
                "Follow requests",
                "Solicitudes para seguir",
              )}
              <b>{requestCount}</b>
            </h3>
            <PrivacyListSearch
              value={requestQuery}
              busy={loadingList === "requests"}
              placeholder={tri(
                lang,
                "Buscar solicitação",
                "Search requests",
                "Buscar solicitud",
              )}
              lang={lang}
              onChange={setRequestQuery}
              onSubmit={() => void searchList("requests", requestQuery)}
            />
            {requests.length === 0 ? (
              <p>
                {tri(
                  lang,
                  "Nenhuma solicitação.",
                  "No requests.",
                  "Ninguna solicitud.",
                )}
              </p>
            ) : (
              <ul>
                {requests.map((person) => (
                  <li key={person.id}>
                    <Link href={`/${lang}/u/${person.username}`}>
                      <span className="privacy-request-avatar">
                        {person.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.avatar_url} alt="" />
                        ) : (
                          (person.display_name || person.username)
                            .slice(0, 1)
                            .toUpperCase()
                        )}
                      </span>
                      <span>
                        <strong>
                          {person.display_name || person.username}
                        </strong>
                        <small>@{person.username}</small>
                      </span>
                    </Link>
                    <div>
                      <button
                        type="button"
                        disabled={Boolean(pending)}
                        onClick={() => void reviewRequest(person.id, true)}
                      >
                        {pending === `request-${person.id}` ? (
                          <LoaderCircle
                            className="spin"
                            size={13}
                            aria-hidden
                          />
                        ) : (
                          <Check size={13} />
                        )}
                        {tri(lang, "Aceitar", "Accept", "Aceptar")}
                      </button>
                      <button
                        type="button"
                        data-danger
                        disabled={Boolean(pending)}
                        onClick={() => void reviewRequest(person.id, false)}
                      >
                        {tri(lang, "Recusar", "Decline", "Rechazar")}
                      </button>
                    </div>
                  </li>
                ))}
                {requests.length < requestCount && (
                  <li className="privacy-load-more-row">
                    <PrivacyLoadMore
                      busy={loadingList === "requests"}
                      lang={lang}
                      onClick={() => void loadMore("requests")}
                    />
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="settings-security-card settings-privacy-card">
        <header>
          <span>
            <MessageCircle size={20} />
          </span>
          <div>
            <h2>
              {tri(
                lang,
                "Comentários no perfil",
                "Profile comments",
                "Comentarios del perfil",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Escolha quem pode publicar comentários no seu perfil. Você sempre poderá excluir qualquer comentário recebido.",
                "Choose who can post on your profile. You can always remove any comment you receive.",
                "Elige quién puede publicar comentarios en tu perfil. Siempre podrás eliminar cualquier comentario recibido.",
              )}
            </p>
          </div>
        </header>
        <ScopePicker
          disabled={Boolean(pending)}
          value={scope}
          onPick={(next) => void updateScope(next)}
          options={[
            ["FOLLOWERS", t.onlyFollowers],
            ["EVERYONE", t.everyone],
            ["NOBODY", t.nobody],
          ]}
        />
      </section>

      <section className="settings-security-card settings-privacy-card">
        <header>
          <span>
            <MessageCircle size={20} />
          </span>
          <div>
            <h2>
              {tri(
                lang,
                "Comentários nas suas publicações",
                "Comments on your posts",
                "Comentarios en tus publicaciones",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Vale para avaliações, listas, capturas e sessões. Você sempre poderá remover qualquer comentário.",
                "Applies to reviews, lists, screenshots, and sessions. You can always remove any comment.",
                "Vale para reseñas, listas, capturas y sesiones. Siempre podrás quitar cualquier comentario.",
              )}
            </p>
          </div>
        </header>
        <ScopePicker
          disabled={Boolean(pending)}
          value={contentScope}
          onPick={(next) => void updateContentScope(next)}
          options={[
            ["EVERYONE", t.everyone],
            ["FOLLOWERS", t.onlyFollowers],
            ["NOBODY", t.nobody],
          ]}
        />
      </section>

      <section className="settings-security-card settings-privacy-card">
        <header>
          <span>
            <Eye size={20} />
          </span>
          <div>
            <h2>
              {tri(
                lang,
                "Quem pode ver seu perfil",
                "Who can see your profile",
                "Quién puede ver tu perfil",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Restringir esconde biblioteca, listas e atividade de quem não segue você. Seu @ continua encontrável.",
                "Restricting hides your library, lists and activity from people who do not follow you. Your handle stays findable.",
                "Restringir oculta la biblioteca, las listas y la actividad a quien no te sigue. Tu @ sigue siendo localizable.",
              )}
            </p>
          </div>
        </header>
        <ScopePicker
          disabled={Boolean(pending)}
          value={visibility}
          onPick={(next) => void updateVisibility(next)}
          options={[
            ["EVERYONE", t.everyone],
            ["FOLLOWERS", t.onlyFollowers],
          ]}
        />
      </section>

      {/* Only for people who linked a channel. A switch about a service the
          account has no connection to is a question nobody asked. */}
      {initialTwitchUsername && (
        <section className="settings-security-card settings-privacy-card">
          <header>
            <span>
              <SiTwitch size={19} />
            </span>
            <div>
              <h2>
                {tri(
                  lang,
                  "Live da Twitch no perfil",
                  "Twitch stream on your profile",
                  "Directo de Twitch en tu perfil",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  `Quando o canal ${initialTwitchUsername} estiver ao vivo, aparece um card no seu perfil com um link para assistir. Desligar mantém o link da Twitch nas suas redes.`,
                  `While ${initialTwitchUsername} is live, a card appears on your profile with a link to watch. Turning this off keeps the Twitch link in your social networks.`,
                  `Cuando el canal ${initialTwitchUsername} esté en vivo, aparece una tarjeta en tu perfil con un enlace para verlo. Desactivarlo mantiene el enlace de Twitch en tus redes.`,
                )}
              </p>
            </div>
          </header>
          <div className="privacy-toggle">
            <Switch
              checked={twitchLive}
              disabled={Boolean(pending)}
              aria-label={tri(
                lang,
                "Mostrar a live no perfil",
                "Show the stream on my profile",
                "Mostrar el directo en mi perfil",
              )}
              onCheckedChange={(checked) => void updateTwitchLive(checked)}
            />
            <span>
              {twitchLive
                ? tri(
                    lang,
                    "A live aparece no seu perfil",
                    "The stream appears on your profile",
                    "El directo aparece en tu perfil",
                  )
                : tri(
                    lang,
                    "A live não aparece no seu perfil",
                    "The stream does not appear on your profile",
                    "El directo no aparece en tu perfil",
                  )}
            </span>
            {pending === "twitch-live" && (
              <LoaderCircle className="spin" size={14} aria-hidden />
            )}
          </div>
        </section>
      )}

      <section className="settings-security-card settings-privacy-card">
        <header>
          <span>
            <UserX size={20} />
          </span>
          <div>
            <h2>
              {tri(
                lang,
                "Contas bloqueadas",
                "Blocked accounts",
                "Cuentas bloqueadas",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Contas bloqueadas não podem seguir, comentar ou interagir com você. As conexões existentes são removidas.",
                "Blocked accounts cannot follow, comment, or interact with you. Existing connections are removed.",
                "Las cuentas bloqueadas no pueden seguirte, comentar ni interactuar contigo. Las conexiones existentes se eliminan.",
              )}
            </p>
          </div>
        </header>
        <PrivacyListSearch
          value={blockedQuery}
          busy={loadingList === "blocked"}
          placeholder={tri(
            lang,
            "Buscar conta bloqueada",
            "Search blocked accounts",
            "Buscar cuenta bloqueada",
          )}
          lang={lang}
          onChange={setBlockedQuery}
          onSubmit={() => void searchList("blocked", blockedQuery)}
        />
        {blocked.length ? (
          <div className="privacy-blocked-list">
            {blocked.map((profile) => (
              <article key={profile.id}>
                <span aria-hidden>
                  {(profile.display_name || profile.username)
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <div>
                  <strong>
                    {profile.display_name || `@${profile.username}`}
                  </strong>
                  <small>@{profile.username}</small>
                </div>
                <button
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() => void unblock(profile)}
                >
                  {pending === profile.id && (
                    <LoaderCircle className="spin" size={14} aria-hidden />
                  )}
                  {t.unblock}
                </button>
              </article>
            ))}
            {blocked.length < blockedCount && (
              <PrivacyLoadMore
                busy={loadingList === "blocked"}
                lang={lang}
                onClick={() => void loadMore("blocked")}
              />
            )}
          </div>
        ) : (
          <div className="privacy-blocked-empty">
            <LockKeyhole size={18} />
            {tri(
              lang,
              "Você não bloqueou nenhuma conta.",
              "You have not blocked any accounts.",
              "No has bloqueado ninguna cuenta.",
            )}
          </div>
        )}
        {message && (
          <p className="settings-security-error" role="alert">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

/** Search box shared by the follow request and blocked account lists. */
function PrivacyListSearch({
  value,
  busy,
  placeholder,
  lang,
  onChange,
  onSubmit,
}: {
  value: string;
  busy: boolean;
  placeholder: string;
  lang: UiLang;
  onChange: (next: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="privacy-list-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="search-field-hit">
        {busy ? (
          <LoaderCircle className="spin" size={14} aria-hidden />
        ) : (
          <Search size={14} aria-hidden />
        )}
        <input
          value={value}
          maxLength={60}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <SearchSubmit lang={lang} pending={busy} />
    </form>
  );
}

function PrivacyLoadMore({
  busy,
  lang,
  onClick,
}: {
  busy: boolean;
  lang: UiLang;
  onClick: () => void;
}) {
  const t = uiText(lang);
  return (
    <button
      type="button"
      className="privacy-load-more"
      disabled={busy}
      onClick={onClick}
    >
      {busy && <LoaderCircle className="spin" size={14} aria-hidden />}
      {busy ? t.loading : t.loadMore}
    </button>
  );
}
