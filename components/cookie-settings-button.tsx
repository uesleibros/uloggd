"use client";

import { openCookieSettings } from "./cookie-consent";

export function CookieSettingsButton({ lang }: { lang: "pt-BR" | "en" }) {
  return (
    <button type="button" onClick={openCookieSettings}>
      {lang === "pt-BR" ? "Configurações de cookies" : "Cookie settings"}
    </button>
  );
}
