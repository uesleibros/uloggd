"use client";

import * as Dialog from "@/components/ui/dialog";
import { Check, Cookie, LockKeyhole, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const STORAGE_KEY = "uloggd_cookie_preferences_v1";
const SETTINGS_EVENT = "uloggd:open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function CookieConsent({ lang }: { lang: UiLang }) {
  const t = uiText(lang);
  const [ready, setReady] = useState(false);
  const [acknowledged, setAcknowledged] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const hydratePreference = window.setTimeout(() => {
      try {
        setAcknowledged(Boolean(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setAcknowledged(false);
      }
      setReady(true);
    }, 0);
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(SETTINGS_EVENT, openSettings);
    return () => {
      window.clearTimeout(hydratePreference);
      window.removeEventListener(SETTINGS_EVENT, openSettings);
    };
  }, []);

  function saveNecessaryChoice() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          necessary: true,
          preferences: false,
          analytics: false,
          marketing: false,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // The current session can continue even when browser storage is blocked.
    }
    setAcknowledged(true);
    setSettingsOpen(false);
  }

  const categories = [
    {
      name: tri(lang, "Necessários", "Necessary", "Necesarias"),
      description: tri(
        lang,
        "Autenticação do Supabase, segurança e prevenção de abuso pelo Turnstile.",
        "Supabase authentication, security, and Turnstile abuse prevention.",
        "Autenticación de Supabase, seguridad y prevención de abuso con Turnstile.",
      ),
      enabled: true,
      status: tri(lang, "Sempre ativos", "Always active", "Siempre activas"),
    },
    {
      name: t.preferences,
      description: tri(
        lang,
        "Reservado para futuras escolhas funcionais salvas no navegador.",
        "Reserved for future functional choices saved in the browser.",
        "Reservado para futuras opciones funcionales guardadas en el navegador.",
      ),
      enabled: false,
      status: t.notInUse,
    },
    {
      name: "Analytics",
      description: tri(
        lang,
        "Medição opcional de uso e desempenho. Nenhuma ferramenta está instalada.",
        "Optional usage and performance measurement. No tool is installed.",
        "Medición opcional de uso y rendimiento. No hay ninguna herramienta instalada.",
      ),
      enabled: false,
      status: t.notInUse,
    },
    {
      name: "Marketing",
      description: tri(
        lang,
        "Publicidade ou rastreamento entre sites. Nenhuma ferramenta está instalada.",
        "Advertising or cross-site tracking. No tool is installed.",
        "Publicidad o rastreo entre sitios. No hay ninguna herramienta instalada.",
      ),
      enabled: false,
      status: t.notInUse,
    },
  ];

  return (
    <>
      {ready && !acknowledged && (
        <section
          className="cookie-banner"
          aria-label={tri(
            lang,
            "Aviso de cookies",
            "Cookie notice",
            "Aviso de cookies",
          )}
        >
          <div className="cookie-banner-icon" aria-hidden>
            <Cookie size={19} />
          </div>
          <div className="cookie-banner-copy">
            <h2>
              {tri(
                lang,
                "Cookies necessários",
                "Necessary cookies",
                "Cookies necesarias",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Usamos somente cookies essenciais para login e segurança. Analytics e marketing estão desativados.",
                "We only use essential cookies for sign-in and security. Analytics and marketing are disabled.",
                "Solo usamos cookies esenciales para el inicio de sesión y la seguridad. Analítica y marketing están desactivados.",
              )}{" "}
              <Link href={`/${lang}/legal/cookies`}>
                {tri(
                  lang,
                  "Política de Cookies",
                  "Cookie Policy",
                  "Política de Cookies",
                )}
              </Link>
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" onClick={() => setSettingsOpen(true)}>
              {tri(lang, "Configurações", "Settings", "Ajustes")}
            </button>
            <button type="button" onClick={saveNecessaryChoice}>
              {tri(
                lang,
                "Continuar com necessários",
                "Continue with necessary",
                "Continuar con los necesarios",
              )}
            </button>
          </div>
        </section>
      )}

      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="cookie-modal-backdrop" />
          <Dialog.Content className="cookie-modal">
            <header>
              <div>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Configurações de cookies",
                    "Cookie settings",
                    "Ajustes de cookies",
                  )}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Veja o que o uloggd usa hoje e controle futuras categorias opcionais.",
                    "See what uloggd uses today and control future optional categories.",
                    "Mira lo que uloggd usa hoy y controla futuras categorías opcionales.",
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={18} />
              </Dialog.Close>
            </header>
            <div className="cookie-categories">
              {categories.map((category) => (
                <section key={category.name}>
                  <div className="cookie-category-heading">
                    <div>
                      <h3>{category.name}</h3>
                      <span>{category.status}</span>
                    </div>
                    <span
                      className="cookie-category-state"
                      data-enabled={category.enabled || undefined}
                    >
                      {category.enabled ? (
                        <Check size={14} />
                      ) : (
                        <LockKeyhole size={13} />
                      )}
                    </span>
                  </div>
                  <p>{category.description}</p>
                </section>
              ))}
            </div>
            <footer>
              <Link href={`/${lang}/legal/cookies`}>
                {tri(
                  lang,
                  "Ler política completa",
                  "Read full policy",
                  "Leer la política completa",
                )}
              </Link>
              <button type="button" onClick={saveNecessaryChoice}>
                {tri(
                  lang,
                  "Salvar configurações necessárias",
                  "Save necessary settings",
                  "Guardar ajustes necesarios",
                )}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
