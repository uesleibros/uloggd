"use client";

import { Check } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  saveThemePreference,
  THEME_CHANGE_EVENT,
} from "@/components/theme-manager";
import { isThemePreference, type ThemePreference } from "@/lib/theme";

const themes: Array<{
  id: ThemePreference;
  label: { "pt-BR": string; en: string };
  description: { "pt-BR": string; en: string };
}> = [
  {
    id: "auto",
    label: { "pt-BR": "Automático", en: "Automatic" },
    description: {
      "pt-BR": "Acompanha a aparência do seu dispositivo.",
      en: "Follows your device appearance.",
    },
  },
  {
    id: "light",
    label: { "pt-BR": "Claro", en: "Light" },
    description: {
      "pt-BR": "Superfícies claras com contraste confortável.",
      en: "Light surfaces with comfortable contrast.",
    },
  },
  {
    id: "gray",
    label: { "pt-BR": "Cinza", en: "Gray" },
    description: {
      "pt-BR": "Um meio-termo suave, inspirado no Ash.",
      en: "A softer middle ground inspired by Ash.",
    },
  },
  {
    id: "dark",
    label: { "pt-BR": "Escuro", en: "Dark" },
    description: {
      "pt-BR": "A experiência clássica do uloggd.",
      en: "The classic uloggd experience.",
    },
  },
  {
    id: "onyx",
    label: { "pt-BR": "Ônix", en: "Onyx" },
    description: {
      "pt-BR": "Pretos profundos para ambientes com pouca luz.",
      en: "Deep blacks for low-light environments.",
    },
  },
];

export function AppearanceSettings({ lang }: { lang: "pt-BR" | "en" }) {
  const selected = useSyncExternalStore(
    (notify) => {
      window.addEventListener(THEME_CHANGE_EVENT, notify);
      return () => window.removeEventListener(THEME_CHANGE_EVENT, notify);
    },
    () => {
      const preference = document.documentElement.dataset.themePreference;
      return isThemePreference(preference) ? preference : "auto";
    },
    () => "auto" as ThemePreference,
  );

  const selectTheme = (preference: ThemePreference) => {
    saveThemePreference(preference);
  };

  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <header>
        <span>{lang === "pt-BR" ? "INTERFACE" : "INTERFACE"}</span>
        <h2 id="appearance-title">
          {lang === "pt-BR" ? "Tema do uloggd" : "uloggd theme"}
        </h2>
        <p>
          {lang === "pt-BR"
            ? "Escolha como as superfícies, textos e controles aparecem neste dispositivo. A alteração é aplicada na hora."
            : "Choose how surfaces, text, and controls appear on this device. Changes apply immediately."}
        </p>
      </header>

      <fieldset className="theme-options">
        <legend className="sr-only">
          {lang === "pt-BR" ? "Escolha um tema" : "Choose a theme"}
        </legend>
        {themes.map((theme) => (
          <label
            className="theme-option"
            data-theme-preview={theme.id}
            data-selected={selected === theme.id || undefined}
            key={theme.id}
          >
            <input
              type="radio"
              name="theme"
              value={theme.id}
              checked={selected === theme.id}
              onChange={() => selectTheme(theme.id)}
            />
            <span className="theme-preview" aria-hidden>
              <i />
              <b>
                <i />
                <i />
                <i />
              </b>
            </span>
            <span className="theme-option-copy">
              <strong>{theme.label[lang]}</strong>
              <small>{theme.description[lang]}</small>
            </span>
            <span className="theme-option-check" aria-hidden>
              <Check size={14} />
            </span>
          </label>
        ))}
      </fieldset>

      <p className="appearance-device-note">
        {lang === "pt-BR"
          ? "Esta preferência é salva somente neste navegador."
          : "This preference is saved only in this browser."}
      </p>
    </section>
  );
}
