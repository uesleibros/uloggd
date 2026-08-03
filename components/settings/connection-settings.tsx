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
import { SiSteam, SiTwitch } from "react-icons/si";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

type Notice = { tone: "ok" | "error"; text: string };
type ServiceId = "twitch" | "steam";

/**
 * One service's worth of wiring, so adding the next one is a table entry
 * rather than another copy of the same card.
 */
type Service = {
  id: ServiceId;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  /** Where the linked account lives, for the outbound link on the handle. */
  profileUrl: (address: string) => string;
  /** The RPC that clears it. Every service unlinks from the browser. */
  disconnectRpc: string;
};

const SERVICES: Service[] = [
  {
    id: "twitch",
    label: "Twitch",
    Icon: SiTwitch,
    profileUrl: (handle) => `https://twitch.tv/${handle}`,
    disconnectRpc: "disconnect_twitch",
  },
  {
    id: "steam",
    label: "Steam",
    Icon: SiSteam,
    // By id rather than by name: a Steam display name is not addressable and
    // changes whenever its owner feels like it.
    profileUrl: (id) => `https://steamcommunity.com/profiles/${id}`,
    disconnectRpc: "disconnect_steam",
  },
];

/**
 * Accounts on other sites that this account has proved it owns.
 *
 * Its own tab rather than fields in the profile form, because these are not
 * things you write about yourself. A handle typed into a text box is a claim;
 * a handle that arrived through the other site's own sign-in is that site
 * confirming it, and the two do not belong side by side where they would look
 * equally trustworthy.
 *
 * Only proved connections live here. YouTube, Instagram and X stay in the
 * profile form: those are links somebody chose to show, and the site does not
 * pretend to have checked them.
 */
export function ConnectionSettings({
  twitchUsername,
  steamId,
  steamUsername,
  lang,
}: {
  twitchUsername: string | null;
  steamId: string | null;
  steamUsername: string | null;
  lang: UiLang;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<
    Record<ServiceId, { handle: string; address: string } | null>
  >({
    twitch: twitchUsername
      ? { handle: twitchUsername, address: twitchUsername }
      : null,
    // The name is what people read; the id is what the link needs. Without a
    // Steam API key the name is missing, and the id stands in for it.
    steam: steamId
      ? { handle: steamUsername || steamId, address: steamId }
      : null,
  });
  const [pending, setPending] = useState<ServiceId | null>(null);
  const [actionNotice, setActionNotice] = useState<Notice | null>(null);

  // The connect flow leaves the site and comes back, so its result arrives in
  // the URL rather than from a promise. Read straight from the parameter
  // instead of copied into state in an effect: it is already derived from the
  // address, and the settings tabs drop the parameter when you leave this tab,
  // which is what keeps a month-old "connected" from reappearing.
  const outcome = SERVICES.map(
    (service) => [service, searchParams.get(service.id)] as const,
  ).find(([, value]) => value);
  const urlNotice = outcome
    ? noticeFor(outcome[0].label, outcome[1]!, lang)
    : null;
  // Whatever happened most recently. Disconnecting after arriving back from a
  // failed connect should not leave the failure on screen.
  const notice = actionNotice ?? urlNotice;

  async function disconnect(service: Service) {
    if (pending) return;
    setPending(service.id);
    setActionNotice(null);
    const { error } = await createClient().rpc(service.disconnectRpc);
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
      setConnected((current) => ({ ...current, [service.id]: null }));
      setActionNotice({
        tone: "ok",
        text: tri(
          lang,
          `Conta da ${service.label} desconectada.`,
          `${service.label} account disconnected.`,
          `Cuenta de ${service.label} desconectada.`,
        ),
      });
      router.refresh();
    }
    setPending(null);
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

        {SERVICES.map((service, index) => {
          const link = connected[service.id];
          return (
            <motion.article
              key={service.id}
              className="settings-connection"
              data-service={service.id}
              data-connected={link ? "true" : "false"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span className="settings-connection-mark">
                <service.Icon size={20} />
              </span>
              <div className="settings-connection-body">
                <strong>{service.label}</strong>
                {link ? (
                  <a
                    className="settings-connection-handle"
                    href={service.profileUrl(link.address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.handle}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ) : (
                  <small>
                    {service.id === "twitch"
                      ? tri(
                          lang,
                          "Conecte para mostrar seu canal no perfil e avisar quando você estiver ao vivo.",
                          "Connect to show your channel on your profile and let people know when you are live.",
                          "Conecta para mostrar tu canal en tu perfil y avisar cuando estés en directo.",
                        )
                      : tri(
                          lang,
                          "Conecte para mostrar seu perfil da Steam e o que você está jogando agora.",
                          "Connect to show your Steam profile and what you are playing right now.",
                          "Conecta para mostrar tu perfil de Steam y a qué estás jugando ahora.",
                        )}
                  </small>
                )}
              </div>
              {link ? (
                <button
                  type="button"
                  className="settings-connection-remove"
                  onClick={() => void disconnect(service)}
                  disabled={Boolean(pending)}
                >
                  {pending === service.id ? (
                    <LoaderCircle className="spin" size={14} aria-hidden />
                  ) : (
                    <Unlink size={14} aria-hidden />
                  )}
                  {tri(lang, "Desconectar", "Disconnect", "Desconectar")}
                </button>
              ) : (
                // A link, not a fetch. The flow is a full page trip to the
                // other site and back, and a button that quietly navigates
                // would be a button that lies about what it does.
                <a
                  className="settings-connection-add"
                  href={`/api/${service.id}/connect?lang=${lang}`}
                >
                  <service.Icon size={14} />
                  {tri(lang, "Conectar", "Connect", "Conectar")}
                </a>
              )}
            </motion.article>
          );
        })}

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

/** The message for one round trip, named by what came back in the URL. */
function noticeFor(label: string, result: string, lang: UiLang): Notice {
  if (result === "connected")
    return {
      tone: "ok",
      text: tri(
        lang,
        `Conta da ${label} conectada.`,
        `${label} account connected.`,
        `Cuenta de ${label} conectada.`,
      ),
    };
  if (result === "cancelled")
    return {
      tone: "error",
      text: tri(
        lang,
        "Conexão cancelada. Nada foi alterado.",
        "Connection cancelled. Nothing changed.",
        "Conexión cancelada. Nada cambió.",
      ),
    };
  if (result === "taken")
    return {
      tone: "error",
      text: tri(
        lang,
        `Essa conta da ${label} já está conectada a outra conta do uloggd.`,
        `That ${label} account is already connected to another uloggd account.`,
        `Esa cuenta de ${label} ya está conectada a otra cuenta de uloggd.`,
      ),
    };
  if (result === "unavailable")
    return {
      tone: "error",
      text: tri(
        lang,
        `A conexão com a ${label} não está disponível agora.`,
        `The ${label} connection is not available right now.`,
        `La conexión con ${label} no está disponible ahora.`,
      ),
    };
  return {
    tone: "error",
    text: tri(
      lang,
      "Não foi possível conectar. Tente de novo.",
      "Could not connect. Try again.",
      "No se pudo conectar. Inténtalo de nuevo.",
    ),
  };
}
