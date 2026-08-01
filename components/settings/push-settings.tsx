"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Turns push notifications on for this device, and lists the others.
 *
 * Permission is only ever requested from a click. Browsers penalise a site that
 * asks on load, and more to the point someone who has not asked for
 * notifications should not be interrupted by a prompt for them.
 *
 * Everything here degrades to nothing: a browser without push support, or a
 * deployment without VAPID keys, renders an explanation instead of a control
 * that cannot work.
 */
type Device = {
  id: string;
  endpoint: string;
  device_label: string | null;
  created_at: string;
};

/** The VAPID key travels as base64url and the subscribe call wants bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/** Something recognisable in a device list, without fingerprinting. */
function deviceLabel() {
  const agent = navigator.userAgent;
  const platform = /Android/i.test(agent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(agent)
      ? "iOS"
      : /Windows/i.test(agent)
        ? "Windows"
        : /Mac/i.test(agent)
          ? "Mac"
          : /Linux/i.test(agent)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "";
  return [platform, browser].filter(Boolean).join(" · ").slice(0, 40) || null;
}

export function PushSettings({
  lang,
  viewerId,
  vapidPublicKey,
}: {
  lang: UiLang;
  viewerId: string;
  vapidPublicKey: string;
}) {
  // Read as an external store rather than resolved in an effect: it is a
  // browser capability, it never changes during a session, and the server
  // snapshot is deliberately null so the card renders nothing until the client
  // knows the answer, instead of rendering the wrong answer and correcting it.
  const supported = useSyncExternalStore(
    () => () => {},
    () =>
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      Boolean(vapidPublicKey),
    () => null,
  );
  const [devices, setDevices] = useState<Device[]>([]);
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("push_subscriptions")
      .select("id,endpoint,device_label,created_at")
      .order("created_at", { ascending: false });
    setDevices((data ?? []) as Device[]);
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void (async () => {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (cancelled) return;
      setThisEndpoint(existing?.endpoint ?? null);
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, supported]);

  async function enable() {
    setPending(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          tri(
            lang,
            "As notificações estão bloqueadas para este site. Libere nas configurações do navegador.",
            "Notifications are blocked for this site. Allow them in your browser settings.",
            "Las notificaciones están bloqueadas para este sitio. Permítelas en tu navegador.",
          ),
        );
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Required by every browser that implements push: a subscription that
        // could deliver silently is not allowed.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const raw = subscription.toJSON();
      const { error: saveError } = await createClient()
        .from("push_subscriptions")
        .upsert(
          {
            profile_id: viewerId,
            endpoint: subscription.endpoint,
            p256dh: raw.keys?.p256dh ?? "",
            auth: raw.keys?.auth ?? "",
            device_label: deviceLabel(),
          },
          { onConflict: "endpoint" },
        );
      if (saveError) throw saveError;
      setThisEndpoint(subscription.endpoint);
      await load();
    } catch {
      setError(
        tri(
          lang,
          "Não foi possível ativar as notificações agora.",
          "Could not turn notifications on right now.",
          "No se pudieron activar las notificaciones ahora.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function remove(device: Device) {
    setPending(true);
    setError(null);
    try {
      await createClient()
        .from("push_subscriptions")
        .delete()
        .eq("id", device.id);
      // Only unsubscribe the browser when removing the device being used, since
      // the others belong to browsers this code cannot reach.
      if (device.endpoint === thisEndpoint) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        await subscription?.unsubscribe();
        setThisEndpoint(null);
      }
      await load();
    } catch {
      setError(
        tri(
          lang,
          "Não foi possível remover este aparelho.",
          "Could not remove this device.",
          "No se pudo eliminar este dispositivo.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  // Nothing at all while support is still being determined, so the card does
  // not appear and then contradict itself a frame later.
  if (supported === null) return null;

  const enabledHere = Boolean(thisEndpoint);

  return (
    <section className="push-settings">
      <header>
        <span>
          <BellRing size={20} />
        </span>
        <div>
          <small>{tri(lang, "AVISOS", "ALERTS", "AVISOS")}</small>
          <h2>
            {tri(
              lang,
              "Notificações push",
              "Push notifications",
              "Notificaciones push",
            )}
          </h2>
          <p>
            {supported
              ? tri(
                  lang,
                  "Receba um aviso quando alguém curtir, comentar ou seguir você, mesmo com o uloggd fechado. Vale por aparelho, e o que você recebe continua sendo escolhido em Notificações.",
                  "Get a heads-up when someone likes, comments or follows you, even with uloggd closed. Per device, and what you receive is still chosen under Notifications.",
                  "Recibe un aviso cuando alguien te dé me gusta, comente o te siga, incluso con uloggd cerrado. Por dispositivo, y lo que recibes se sigue eligiendo en Notificaciones.",
                )
              : tri(
                  lang,
                  "Este navegador não oferece notificações push. No iPhone, é preciso instalar o uloggd na tela de início primeiro.",
                  "This browser does not support push notifications. On iPhone, uloggd has to be installed to the home screen first.",
                  "Este navegador no admite notificaciones push. En iPhone, hay que instalar uloggd en la pantalla de inicio primero.",
                )}
          </p>
        </div>
      </header>

      {supported && (
        <div className="push-settings-body">
          {!enabledHere && (
            <button
              type="button"
              className="push-settings-enable"
              onClick={enable}
              disabled={pending}
            >
              {pending ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <BellRing size={15} />
              )}
              {tri(
                lang,
                "Ativar neste aparelho",
                "Turn on for this device",
                "Activar en este dispositivo",
              )}
            </button>
          )}

          {devices.length > 0 && (
            <ul className="push-device-list">
              {devices.map((device) => (
                <li key={device.id}>
                  <span>
                    <strong>
                      {device.device_label ||
                        tri(lang, "Aparelho", "Device", "Dispositivo")}
                    </strong>
                    {device.endpoint === thisEndpoint && (
                      <b>
                        {tri(
                          lang,
                          "Este aparelho",
                          "This device",
                          "Este dispositivo",
                        )}
                      </b>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(device)}
                    disabled={pending}
                    aria-label={tri(lang, "Remover", "Remove", "Eliminar")}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="push-settings-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
