"use client";

import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { SiDiscord, SiGoogle, SiTwitch } from "react-icons/si";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

type Identity = {
  provider: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

/**
 * How each provider is named and drawn.
 *
 * Unknown providers fall back to the raw name rather than being hidden: a
 * sign-in method somebody has and cannot see is worse than one shown plainly
 * without an icon.
 */
const PROVIDERS: Record<
  string,
  { label: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  email: { label: "E-mail", Icon: Mail },
  google: { label: "Google", Icon: SiGoogle },
  discord: { label: "Discord", Icon: SiDiscord },
  twitch: { label: "Twitch", Icon: SiTwitch },
};

/**
 * The ways this account can get back in.
 *
 * Worth its own card because it answers a question nobody can answer for
 * themselves: somebody who signed up through Discord a year ago and returns to
 * a password prompt has no way to learn they never set one.
 */
export function LoginMethods({ lang }: { lang: UiLang }) {
  const [identities, setIdentities] = useState<Identity[] | null>(null);

  useEffect(() => {
    let active = true;
    void createClient()
      .rpc("list_own_identities")
      .then(({ data }) => {
        if (active) setIdentities((data ?? []) as Identity[]);
      });
    return () => {
      active = false;
    };
  }, []);

  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section className="settings-security-card">
      <header>
        <span>
          <KeyRound size={20} />
        </span>
        <div>
          <h2>
            {tri(
              lang,
              "Como você entra",
              "How you sign in",
              "Cómo inicias sesión",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Os métodos ligados a esta conta. Qualquer um deles entra na mesma conta.",
              "The methods linked to this account. Any of them signs in to the same account.",
              "Los métodos vinculados a esta cuenta. Cualquiera de ellos entra en la misma cuenta.",
            )}
          </p>
        </div>
      </header>

      {identities === null ? (
        <p className="settings-passkey-loading">
          <LoaderCircle className="spin" size={15} aria-hidden />
          {tri(lang, "Carregando…", "Loading…", "Cargando…")}
        </p>
      ) : (
        <ul className="login-methods">
          {identities.map((identity, index) => {
            const known = PROVIDERS[identity.provider];
            const Icon = known?.Icon ?? ShieldCheck;
            return (
              <li key={identity.provider}>
                <Icon size={17} />
                <span>
                  <strong>
                    {known?.label ?? identity.provider}
                    {/* The list is ordered by most recent sign-in, so the first
                        row is the one they actually used to get here. */}
                    {index === 0 && (
                      <em>
                        {tri(
                          lang,
                          "usado por último",
                          "last used",
                          "usado por última vez",
                        )}
                      </em>
                    )}
                  </strong>
                  <small>
                    {identity.email ? `${identity.email} · ` : ""}
                    {tri(lang, "ligado em", "linked", "vinculado")}{" "}
                    {date.format(new Date(identity.created_at))}
                  </small>
                </span>
              </li>
            );
          })}
          {!identities.length && (
            <li className="login-methods-empty">
              {tri(
                lang,
                "Nenhum método encontrado.",
                "No methods found.",
                "No se encontró ningún método.",
              )}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
