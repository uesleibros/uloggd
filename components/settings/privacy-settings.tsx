"use client";

import {
  Check,
  Eye,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  initialRequests,
  initialBlocked,
  lang,
}: {
  initialScope: Scope;
  initialContentScope: Scope;
  initialVisibility: Visibility;
  initialPrivate: boolean;
  initialRequests: FollowRequest[];
  initialBlocked: BlockedProfile[];
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [scope, setScope] = useState(initialScope);
  const [contentScope, setContentScope] = useState(initialContentScope);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [requests, setRequests] = useState(initialRequests);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        <label className="privacy-toggle">
          <input
            type="checkbox"
            checked={isPrivate}
            disabled={Boolean(pending)}
            onChange={(event) => void updatePrivacy(event.target.checked)}
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
        </label>

        {isPrivate && (
          <div className="privacy-requests">
            <h3>
              {tri(
                lang,
                "Solicitações para seguir",
                "Follow requests",
                "Solicitudes para seguir",
              )}
              <b>{requests.length}</b>
            </h3>
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
