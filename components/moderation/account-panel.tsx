"use client";

import {
  Ban,
  Building2,
  LoaderCircle,
  Search,
  ShieldOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { SearchSubmit } from "@/components/search-submit";
import { VerifiedMark, VerifiedNameMark } from "@/components/verified-badge";
import { RelativeTime } from "@/components/relative-time";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { useNow } from "@/lib/use-now";
import type { ModerationBan, ModerationProfile, ProfileAction } from "./types";

/**
 * Finding an account, and acting on it.
 *
 * The console had no way to reach an account except through a report, which is
 * the wrong way round: most staff work starts from a name somebody sent you.
 */
export function AccountPanel({
  lang,
  actorRole,
  term,
  onTermChange,
  results,
  bans,
  searching,
  busy,
  onSearch,
  onClear,
  onAct,
}: {
  lang: UiLang;
  actorRole: "MODERATOR" | "ADMIN";
  /**
   * Held by the console, not here. The console writes the term into the
   * address bar every time it navigates, and a copy kept in this component
   * meant it wrote whatever the server had last sent instead: search for one
   * name, change a tab, and the old name came back in the URL.
   */
  term: string;
  onTermChange: (term: string) => void;
  results: ModerationProfile[];
  bans: Map<string, ModerationBan>;
  searching: boolean;
  busy: boolean;
  onSearch: (term: string) => void;
  onClear: () => void;
  onAct: (profile: ModerationProfile, action: ProfileAction) => void;
}) {
  const t = uiText(lang);
  const searched = term.trim().length >= 2;

  return (
    <section className="moderation-section moderation-accounts">
      <header>
        <h2>{tri(lang, "Contas", "Accounts", "Cuentas")}</h2>
        <form
          className="moderation-search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(term.trim().slice(0, 32));
          }}
        >
          <label className="search-field-hit">
            <Search size={15} aria-hidden />
            <input
              type="search"
              name="q"
              value={term}
              onChange={(event) => onTermChange(event.target.value)}
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
                "Nome ou @usuário",
                "Name or @handle",
                "Nombre o @usuario",
              )}
            />
          </label>
          <button
            type="button"
            className="moderation-search-clear"
            data-hidden={!term ? true : undefined}
            aria-label={t.clearSearch}
            onClick={onClear}
          >
            <X size={14} aria-hidden />
          </button>
          <SearchSubmit
            lang={lang}
            pending={searching}
            disabled={term.trim().length < 2}
          />
        </form>
      </header>

      <div className="moderation-account-list">
        {!searched && (
          <p className="moderation-empty" data-hint>
            {tri(
              lang,
              "Busque por nome ou @usuário para agir sobre uma conta.",
              "Search a name or @handle to act on an account.",
              "Busca un nombre o @usuario para actuar sobre una cuenta.",
            )}
          </p>
        )}
        {searched && searching && (
          <p className="moderation-empty">
            <LoaderCircle className="spin" size={16} aria-hidden />
            {tri(lang, "Buscando…", "Searching…", "Buscando…")}
          </p>
        )}
        {searched && !searching && results.length === 0 && (
          <p className="moderation-empty">
            {tri(
              lang,
              "Nenhum usuário encontrado.",
              "No users found.",
              "No se encontraron usuarios.",
            )}
          </p>
        )}
        {results.map((profile) => (
          <AccountCard
            key={profile.id}
            lang={lang}
            actorRole={actorRole}
            profile={profile}
            ban={bans.get(profile.id)}
            busy={busy}
            onAct={onAct}
          />
        ))}
      </div>
    </section>
  );
}

function AccountCard({
  lang,
  actorRole,
  profile,
  ban,
  busy,
  onAct,
}: {
  lang: UiLang;
  actorRole: "MODERATOR" | "ADMIN";
  profile: ModerationProfile;
  ban: ModerationBan | undefined;
  busy: boolean;
  onAct: (profile: ModerationProfile, action: ProfileAction) => void;
}) {
  // A ticking clock rather than the one frozen at mount. The console captured
  // "now" when it loaded, so a tab left open across the end of a ban kept
  // calling the account banned and offering to unban somebody the database had
  // already let back in.
  const now = useNow();
  const banned = Boolean(
    ban && (!ban.banned_until || new Date(ban.banned_until).getTime() > now),
  );
  const untouchable =
    profile.role === "ADMIN" ||
    (actorRole === "MODERATOR" && profile.role !== "USER");
  const name = profile.display_name || profile.username || "?";

  return (
    <article
      className="moderation-account-card"
      data-banned={banned || undefined}
    >
      <span
        className="moderation-account-avatar"
        data-account-type={profile.account_type}
        aria-hidden
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </span>

      <div className="moderation-account-identity">
        <strong>
          {name}
          {profile.verified && <VerifiedNameMark />}
        </strong>
        <span>@{profile.username}</span>
        <small>
          {profile.role !== "USER" && (
            <b data-role={profile.role}>{profile.role}</b>
          )}
          {profile.account_type === "ORGANIZATION" && (
            <b>{tri(lang, "Organização", "Organization", "Organización")}</b>
          )}
          {banned && (
            <b data-banned>{tri(lang, "Banida", "Banned", "Baneada")}</b>
          )}
          <span>
            {tri(lang, "desde", "since", "desde")}{" "}
            <RelativeTime value={profile.created_at} lang={lang} />
          </span>
        </small>
      </div>

      {banned && ban && (
        <blockquote>
          {ban.reason}
          {ban.banned_until && (
            <small>
              {tri(lang, "até", "until", "hasta")}{" "}
              <RelativeTime value={ban.banned_until} lang={lang} />
            </small>
          )}
        </blockquote>
      )}

      <footer>
        {profile.username && (
          <Link href={`/${lang}/u/${profile.username}`} target="_blank">
            {tri(lang, "Perfil", "Profile", "Perfil")}
          </Link>
        )}
        {untouchable ? (
          <p className="moderation-account-protected">
            {tri(
              lang,
              "Conta da equipe: fora do seu alcance.",
              "Staff account: beyond your reach.",
              "Cuenta del equipo: fuera de tu alcance.",
            )}
          </p>
        ) : (
          <>
            {profile.account_type === "ORGANIZATION" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAct(profile, "DEMOTE_ORGANIZATION")}
              >
                <Building2 size={13} aria-hidden />
                {tri(
                  lang,
                  "Revogar organização",
                  "Revoke organization",
                  "Revocar organización",
                )}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onAct(profile, profile.verified ? "UNVERIFY" : "VERIFY")
              }
            >
              {profile.verified ? (
                <ShieldOff size={13} aria-hidden />
              ) : (
                <VerifiedMark size={13} />
              )}
              {profile.verified
                ? tri(lang, "Retirar selo", "Unverify", "Quitar verificación")
                : tri(lang, "Verificar", "Verify", "Verificar")}
            </button>
            <button
              type="button"
              data-danger
              disabled={busy}
              onClick={() => onAct(profile, banned ? "UNBAN" : "BAN")}
            >
              <Ban size={13} aria-hidden />
              {banned
                ? tri(lang, "Desbanir", "Unban", "Desbanear")
                : tri(lang, "Banir", "Ban", "Banear")}
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
