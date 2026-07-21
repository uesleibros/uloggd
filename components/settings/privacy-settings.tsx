"use client";

import {
  Check,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UiLang } from "@/lib/ui-text";

type Scope = "EVERYONE" | "FOLLOWERS" | "NOBODY";
type BlockedProfile = {
  id: string;
  username: string;
  display_name: string | null;
};
export type FollowRequest = BlockedProfile & { avatar_url: string | null };

export function PrivacySettings({
  initialScope,
  initialPrivate,
  initialRequests,
  initialBlocked,
  lang,
}: {
  initialScope: Scope;
  initialPrivate: boolean;
  initialRequests: FollowRequest[];
  initialBlocked: BlockedProfile[];
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const [scope, setScope] = useState(initialScope);
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [requests, setRequests] = useState(initialRequests);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(pt ? "Não foi possível salvar." : "Could not save.");
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
      setMessage(pt ? "Não foi possível responder." : "Could not respond.");
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
      setMessage(pt ? "Não foi possível salvar." : "Could not save.");
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
      setMessage(pt ? "Não foi possível desbloquear." : "Could not unblock.");
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
            <h2>{pt ? "Conta privada" : "Private account"}</h2>
            <p>
              {pt
                ? "Com a conta privada, quem quiser te seguir precisa da sua aprovação. Quem já segue continua seguindo."
                : "With a private account, anyone who wants to follow you needs your approval. Current followers stay."}
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
              ? pt
                ? "Sua conta está privada"
                : "Your account is private"
              : pt
                ? "Sua conta está pública"
                : "Your account is public"}
          </span>
          {pending === "privacy" && (
            <LoaderCircle className="spin" size={14} aria-hidden />
          )}
        </label>

        {isPrivate && (
          <div className="privacy-requests">
            <h3>
              {pt ? "Solicitações para seguir" : "Follow requests"}
              <b>{requests.length}</b>
            </h3>
            {requests.length === 0 ? (
              <p>{pt ? "Nenhuma solicitação." : "No requests."}</p>
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
                        {pt ? "Aceitar" : "Accept"}
                      </button>
                      <button
                        type="button"
                        data-danger
                        disabled={Boolean(pending)}
                        onClick={() => void reviewRequest(person.id, false)}
                      >
                        {pt ? "Recusar" : "Decline"}
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
            <h2>{pt ? "Comentários no perfil" : "Profile comments"}</h2>
            <p>
              {pt
                ? "Escolha quem pode publicar comentários no seu perfil. Você sempre poderá excluir qualquer comentário recebido."
                : "Choose who can post on your profile. You can always remove any comment you receive."}
            </p>
          </div>
        </header>
        <div className="privacy-scope-options" role="radiogroup">
          {(
            [
              [
                "FOLLOWERS",
                pt ? "Pessoas que seguem você" : "People who follow you",
              ],
              [
                "EVERYONE",
                pt ? "Todas as pessoas com conta" : "Everyone with an account",
              ],
              ["NOBODY", pt ? "Ninguém" : "Nobody"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              disabled={Boolean(pending)}
              onClick={() => void updateScope(value)}
            >
              <span>{label}</span>
              <i aria-hidden />
            </button>
          ))}
        </div>
      </section>

      <section className="settings-security-card settings-privacy-card">
        <header>
          <span>
            <UserX size={20} />
          </span>
          <div>
            <h2>{pt ? "Contas bloqueadas" : "Blocked accounts"}</h2>
            <p>
              {pt
                ? "Contas bloqueadas não podem seguir, comentar ou interagir com você. As conexões existentes são removidas."
                : "Blocked accounts cannot follow, comment, or interact with you. Existing connections are removed."}
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
                  {pt ? "Desbloquear" : "Unblock"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="privacy-blocked-empty">
            <LockKeyhole size={18} />
            {pt
              ? "Você não bloqueou nenhuma conta."
              : "You have not blocked any accounts."}
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
