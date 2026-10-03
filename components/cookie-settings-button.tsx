"use client";

import { ToggleRight } from "lucide-react";

import { openCookieSettings } from "./cookie-consent";
import { tri, type UiLang } from "@/lib/ui-text";

export function CookieSettingsButton({ lang }: { lang: UiLang }) {
  return (
    <button
      className="cookie-settings-link"
      type="button"
      onClick={openCookieSettings}
    >
      <ToggleRight size={22} aria-hidden />
      <span>
        {tri(
          lang,
          "Configurações de cookies",
          "Cookie settings",
          "Ajustes de cookies",
        )}
      </span>
    </button>
  );
}
