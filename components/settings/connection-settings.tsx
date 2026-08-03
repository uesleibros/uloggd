"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Link2,
  LoaderCircle,
  Unlink,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SiTwitch } from "react-icons/si";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

type Notice = { tone: "ok" | "error"; text: string };

/**
 * Accounts on other sites that this account has proved it owns.
 *
 * Its own tab rather than a field in the profile form, because these are not
 * things you write about yourself. A handle typed into a text box is a claim;
 * a handle that arrived through OAuth is the other site confirming it, and the
 * two do not belong side by side where they would look equally trustworthy.
 *
 * Only OAuth connections live here. YouTube, Instagram and X stay in the
 * profile form: those are links somebody chose to show, and the site does not
 * pretend to have checked them.
 */
export function ConnectionSettings({
  twitchUsername,
  lang,
}: {
  twitchUsername: string | null;
  lang: UiLang;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(twitchUsername);
  const [pending, setPending] = useState(false);
  const [actionNotice, setActionNotice] = useState<Notice | null>(null);

  // The connect flow leaves the site and comes back, so its result arrives in
  // the URL rather than from a promise. Read straight from the parameter
  // instead of copied into state in an effect: it is already a value derived
  // from the address, and the settings tabs drop the parameter when you leave
  // this tab, which is what keeps a month-old "connected" from reappearing.
  const result = searchParams.get("twitch");
  const urlNotice: Notice | null = !result
    ? null
    : result === "connected"
      ? {
          tone: "ok",
          text: tri(
            lang,
            "Conta da Twitch conectada.",
            "Twitch account connected.",
            "Cuenta de Twitch conectada.",
          ),
        }
      : result === "cancelled"
        ? {
            tone: "error",
            text: tri(
              lang,
              "Conexão cancelada. Nada foi alterado.",
              "Connection cancelled. Nothing changed.",
              "Conexión cancelada. Nada cambió.",
            ),
          }
        : result === "taken"
          ? {
              tone: "error",
              text: tri(
                lang,
                "Esse canal já está conectado a outra conta do uloggd.",
                "That channel is already connected to another uloggd account.",
                "Ese canal ya está conectado a otra cuenta de uloggd.",
              ),
            }
          : result === "unavailable"
            ? {
                tone: "error",
                text: tri(
                  lang,
                  "A conexão com a Twitch não está disponível agora.",
                  "The Twitch connection is not available right now.",
                  "La conexión con Twitch no está disponible ahora.",
                ),
              }
            : {
                tone: "error",
                text: tri(
                  lang,
                  "Não foi possível conectar. Tente de novo.",
                  "Could not connect. Try again.",
                  "No se pudo conectar. Inténtalo de nuevo.",
                ),
              };
  // Whatever happened most recently. Disconnecting after arriving back from a
  // failed connect should not leave the failure on screen.
  const notice = actionNotice ?? urlNotice;

  async function disconnect() {
    if (pending) return;
    setPending(true);
    setActionNotice(null);
    const { error } = await createClient().rpc("disconnect_twitch");
    if (error)
      setActionNotice({
        tone: "error",
        text: tri(
          lang,
          "Não foi possível desconectar. Tente de novo.",
          "Could not disconnect. Try again.",
          "No se pudo desconectar. Inténtalo de nuevo.",
        ),
      });
    else {
      setConnected(null);
      setActionNotice({
        tone: "ok",
        text: tri(
          lang,
          "Conta da Twitch desconectada.",
          "Twitch account disconnected.",
          "Cuenta de Twitch desconectada.",
        ),
      });
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div className="settings-connection-stack">
      <section className="settings-security-card">
        <header>
          <span>
            <Link2 size={20} />
          </span>
          <div>
            <h2>{tri(lang, "Conexões", "Connections", "Conexiones")}</h2>
            <p>
              {tri(
                lang,
                "Contas de outros serviços que você provou ser suas. A conexão passa pelo site do serviço, então o uloggd só mostra o que ele confirmou.",
                "Accounts on other services that you have proved are yours. The connection goes through the service itself, so uloggd only shows what it confirmed.",
                "Cuentas de otros servicios que has probado que son tuyas. La conexión pasa por el sitio del servicio, así que uloggd solo muestra lo que confirmó.",
              )}
            </p>
          </div>
        </header>

        {notice && (
          <motion.p
            className="settings-connection-notice"
            data-tone={notice.tone}
            role={notice.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {notice.tone === "error" ? (
              <AlertTriangle size={14} aria-hidden />
            ) : (
              <CheckCircle2 size={14} aria-hidden />
            )}
            {notice.text}
          </motion.p>
        )}

        <motion.article
          className="settings-connection"
          data-service="twitch"
          data-connected={connected ? "true" : "false"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="settings-connection-mark">
            <SiTwitch size={20} />
          </span>
          <div className="settings-connection-body">
            <strong>Twitch</strong>
            {connected ? (
              <a
                className="settings-connection-handle"
                href={`https://twitch.tv/${connected}`}
                target="_blank"
                rel="noreferrer"
              >
                {connected}
                <ExternalLink size={12} aria-hidden />
              </a>
            ) : (
              <small>
                {tri(
                  lang,
                  "Conecte para mostrar seu canal no perfil e avisar quando você estiver ao vivo.",
                  "Connect to show your channel on your profile and let people know when you are live.",
                  "Conecta para mostrar tu canal en tu perfil y avisar cuando estés en directo.",
                )}
              </small>
            )}
          </div>
          {connected ? (
            <button
              type="button"
              className="settings-connection-remove"
              onClick={() => void disconnect()}
              disabled={pending}
            >
              {pending ? (
                <LoaderCircle className="spin" size={14} aria-hidden />
              ) : (
                <Unlink size={14} aria-hidden />
              )}
              {tri(lang, "Desconectar", "Disconnect", "Desconectar")}
            </button>
          ) : (
            // A link, not a fetch. The flow is a full page trip to Twitch and
            // back, and a button that quietly navigates would be a button that
            // lies about what it does.
            <a
              className="settings-connection-add"
              href={`/api/twitch/connect?lang=${lang}`}
            >
              <SiTwitch size={14} aria-hidden />
              {tri(lang, "Conectar", "Connect", "Conectar")}
            </a>
          )}
        </motion.article>

        <p className="settings-connection-footnote">
          {tri(
            lang,
            "Se você entrou no uloggd com a Twitch, sua conta já aparece conectada aqui. Desconectar não remove o método de login.",
            "If you signed in to uloggd with Twitch, your account already shows as connected here. Disconnecting does not remove the sign-in method.",
            "Si entraste a uloggd con Twitch, tu cuenta ya aparece conectada aquí. Desconectar no elimina el método de inicio de sesión.",
          )}
        </p>
      </section>
    </div>
  );
}
