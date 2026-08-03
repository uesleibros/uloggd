"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LoaderCircle,
  MonitorSmartphone,
  Smartphone,
  Monitor,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { tri, type UiLang } from "@/lib/ui-text";

type Session = {
  id: string;
  created_at: string;
  refreshed_at: string;
  user_agent: string | null;
  ip: string | null;
};

/**
 * A user agent, reduced to what a person recognises.
 *
 * Nobody identifies their laptop by its WebKit build; they identify it as
 * "Chrome on Windows". Wrong guesses degrade to the raw string rather than to
 * a lie.
 */
function describeDevice(userAgent: string | null) {
  if (!userAgent) return null;
  const browser = /Firefox\//.test(userAgent)
    ? "Firefox"
    : /Edg\//.test(userAgent)
      ? "Edge"
      : /OPR\//.test(userAgent)
        ? "Opera"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : null;
  const system = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (!browser && !system) return userAgent.slice(0, 60);
  return [browser, system].filter(Boolean).join(" · ");
}

function isMobile(userAgent: string | null) {
  return Boolean(userAgent && /Android|iPhone|iPad|Mobile/.test(userAgent));
}

/**
 * Where the account is signed in, with a way to sign each one out.
 *
 * The current session is marked and its sign-out routes through the normal
 * sign-out flow rather than the revoke call: revoking your own session server
 * side leaves the browser holding cookies for a session that no longer
 * exists, which looks signed in and fails on everything.
 */
export function SessionSettings({ lang }: { lang: UiLang }) {
  const still = useReducedMotion();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      const [{ data }, { data: claims }] = await Promise.all([
        supabase.rpc("list_own_sessions"),
        supabase.auth.getClaims(),
      ]);
      if (!active) return;
      setSessions((data ?? []) as Session[]);
      setCurrentId((claims?.claims.session_id as string | undefined) ?? null);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function revoke(id: string) {
    setPending(id);
    setError(false);
    const { error: failed } = await createClient().rpc("revoke_own_session", {
      target: id,
    });
    setPending(null);
    if (failed) {
      setError(true);
      return;
    }
    setSessions((current) =>
      current ? current.filter((session) => session.id !== id) : current,
    );
  }

  const date = new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="settings-security-card">
      <header>
        <span>
          <MonitorSmartphone size={20} />
        </span>
        <div>
          <h2>{tri(lang, "Sessões", "Sessions", "Sesiones")}</h2>
          <p>
            {tri(
              lang,
              "Onde esta conta está conectada agora. Se algo aqui não for você, desconecte e troque a senha.",
              "Where this account is signed in right now. If something here is not you, sign it out and change your password.",
              "Dónde está conectada esta cuenta ahora. Si algo aquí no eres tú, desconéctalo y cambia tu contraseña.",
            )}
          </p>
        </div>
      </header>

      {sessions === null ? (
        <p className="settings-passkey-loading">
          <LoaderCircle className="spin" size={15} aria-hidden />
          {tri(lang, "Carregando…", "Loading…", "Cargando…")}
        </p>
      ) : (
        <ul className="session-list">
          <AnimatePresence initial={false}>
            {sessions.map((session) => {
              const current = session.id === currentId;
              const device = describeDevice(session.user_agent);
              const DeviceIcon = isMobile(session.user_agent)
                ? Smartphone
                : Monitor;
              return (
                <motion.li
                  key={session.id}
                  layout={still ? false : "position"}
                  exit={still ? undefined : { opacity: 0, x: -8 }}
                  transition={
                    still
                      ? { duration: 0 }
                      : { duration: MOTION_MS.quick / 1000, ease: EASE_OUT }
                  }
                  data-current={current || undefined}
                >
                  <DeviceIcon size={17} aria-hidden />
                  <span className="session-copy">
                    <strong>
                      {device ??
                        tri(
                          lang,
                          "Dispositivo desconhecido",
                          "Unknown device",
                          "Dispositivo desconocido",
                        )}
                      {current && (
                        <em>
                          {tri(
                            lang,
                            "esta sessão",
                            "this session",
                            "esta sesión",
                          )}
                        </em>
                      )}
                    </strong>
                    <small>
                      {session.ip ? `${session.ip} · ` : ""}
                      {tri(lang, "ativa em", "active", "activa")}{" "}
                      {date.format(new Date(session.refreshed_at))}
                    </small>
                  </span>
                  {!current && (
                    <button
                      type="button"
                      onClick={() => void revoke(session.id)}
                      disabled={pending !== null}
                    >
                      {pending === session.id ? (
                        <LoaderCircle className="spin" size={13} aria-hidden />
                      ) : (
                        <LogOut size={13} aria-hidden />
                      )}
                      {tri(lang, "Desconectar", "Sign out", "Desconectar")}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      {error && (
        <p className="settings-security-error" role="alert">
          {tri(
            lang,
            "Não foi possível desconectar. Tente novamente.",
            "Could not sign out. Try again.",
            "No se pudo desconectar. Inténtalo de nuevo.",
          )}
        </p>
      )}
    </section>
  );
}
