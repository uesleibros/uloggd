"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Cookie, LockKeyhole, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "uloggd_cookie_preferences_v1";
const SETTINGS_EVENT = "uloggd:open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function CookieConsent({ lang }: { lang: "pt-BR" | "en" }) {
  const pt = lang === "pt-BR";
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
      name: pt ? "Necessários" : "Necessary",
      description: pt
        ? "Autenticação do Supabase, segurança e prevenção de abuso pelo Turnstile."
        : "Supabase authentication, security, and Turnstile abuse prevention.",
      enabled: true,
      status: pt ? "Sempre ativos" : "Always active",
    },
    {
      name: pt ? "Preferências" : "Preferences",
      description: pt
        ? "Reservado para futuras escolhas funcionais salvas no navegador."
        : "Reserved for future functional choices saved in the browser.",
      enabled: false,
      status: pt ? "Não utilizados" : "Not in use",
    },
    {
      name: "Analytics",
      description: pt
        ? "Medição opcional de uso e desempenho. Nenhuma ferramenta está instalada."
        : "Optional usage and performance measurement. No tool is installed.",
      enabled: false,
      status: pt ? "Não utilizados" : "Not in use",
    },
    {
      name: "Marketing",
      description: pt
        ? "Publicidade ou rastreamento entre sites. Nenhuma ferramenta está instalada."
        : "Advertising or cross-site tracking. No tool is installed.",
      enabled: false,
      status: pt ? "Não utilizados" : "Not in use",
    },
  ];

  return (
    <>
      {ready && !acknowledged && (
        <section
          className="cookie-banner"
          aria-label={pt ? "Aviso de cookies" : "Cookie notice"}
        >
          <div className="cookie-banner-icon" aria-hidden>
            <Cookie size={19} />
          </div>
          <div className="cookie-banner-copy">
            <h2>{pt ? "Cookies necessários" : "Necessary cookies"}</h2>
            <p>
              {pt
                ? "Usamos somente cookies essenciais para login e segurança. Analytics e marketing estão desativados."
                : "We only use essential cookies for sign-in and security. Analytics and marketing are disabled."}{" "}
              <Link href={`/${lang}/legal/cookies`}>
                {pt ? "Política de Cookies" : "Cookie Policy"}
              </Link>
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" onClick={() => setSettingsOpen(true)}>
              {pt ? "Configurações" : "Settings"}
            </button>
            <button type="button" onClick={saveNecessaryChoice}>
              {pt ? "Continuar com necessários" : "Continue with necessary"}
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
                  {pt ? "Configurações de cookies" : "Cookie settings"}
                </Dialog.Title>
                <Dialog.Description>
                  {pt
                    ? "Veja o que o uloggd usa hoje e controle futuras categorias opcionais."
                    : "See what uloggd uses today and control future optional categories."}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
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
                {pt ? "Ler política completa" : "Read full policy"}
              </Link>
              <button type="button" onClick={saveNecessaryChoice}>
                {pt
                  ? "Salvar configurações necessárias"
                  : "Save necessary settings"}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
