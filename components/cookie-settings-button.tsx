"use client";

import { openCookieSettings } from "./cookie-consent";
import type { UiLang } from "@/lib/ui-text";

export function CookieSettingsButton({ lang }: { lang: UiLang }) {
  return (
    <button type="button" onClick={openCookieSettings}>
      {lang === "pt-BR" ? "Configurações de cookies" : "Cookie settings"}
    </button>
  );
}
