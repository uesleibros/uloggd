"use client";

import { openCookieSettings } from "./cookie-consent";
import { tri, type UiLang } from "@/lib/ui-text";

export function CookieSettingsButton({ lang }: { lang: UiLang }) {
  return (
    <button type="button" onClick={openCookieSettings}>
      {tri(
        lang,
        "Configurações de cookies",
        "Cookie settings",
        "Ajustes de cookies",
      )}
    </button>
  );
}
