"use client";

import { Check } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  saveThemePreference,
  THEME_CHANGE_EVENT,
} from "@/components/theme-manager";
import { isThemePreference, type ThemePreference } from "@/lib/theme";
import { tri, type UiLang } from "@/lib/ui-text";

const themes: Array<{
  id: ThemePreference;
  label: Record<UiLang, string>;
  description: Record<UiLang, string>;
}> = [
  {
    id: "auto",
    label: { "pt-BR": "Automático", en: "Automatic", es: "Automático" },
    description: {
      "pt-BR": "Acompanha a aparência do seu dispositivo.",
      en: "Follows your device appearance.",
      es: "Sigue la apariencia de tu dispositivo.",
    },
  },
  {
    id: "light",
    label: { "pt-BR": "Claro", en: "Light", es: "Claro" },
    description: {
      "pt-BR": "Superfícies claras com contraste confortável.",
      en: "Light surfaces with comfortable contrast.",
      es: "Superficies claras con contraste cómodo.",
    },
  },
  {
    id: "gray",
    label: { "pt-BR": "Cinza", en: "Gray", es: "Gris" },
    description: {
      "pt-BR": "Um meio-termo suave, inspirado no Ash.",
      en: "A softer middle ground inspired by Ash.",
      es: "Un término medio suave, inspirado en Ash.",
    },
  },
  {
    id: "dark",
    label: { "pt-BR": "Escuro", en: "Dark", es: "Oscuro" },
    description: {
      "pt-BR": "A experiência clássica do uloggd.",
      en: "The classic uloggd experience.",
      es: "La experiencia clásica de uloggd.",
    },
  },
  {
    id: "onyx",
    label: { "pt-BR": "Ônix", en: "Onyx", es: "Ónix" },
    description: {
      "pt-BR": "Pretos profundos para ambientes com pouca luz.",
      en: "Deep blacks for low-light environments.",
      es: "Negros profundos para entornos con poca luz.",
    },
  },
];

export function AppearanceSettings({ lang }: { lang: UiLang }) {
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
        <h2 id="appearance-title">
          {tri(lang, "Tema do uloggd", "uloggd theme", "Tema de uloggd")}
        </h2>
        <p>
          {tri(
            lang,
            "Escolha como as superfícies, textos e controles aparecem neste dispositivo. A alteração é aplicada na hora.",
            "Choose how surfaces, text, and controls appear on this device. Changes apply immediately.",
            "Elige cómo se ven las superficies, los textos y los controles en este dispositivo. El cambio se aplica al instante.",
          )}
        </p>
      </header>

      <fieldset className="theme-options">
        <legend className="sr-only">
          {tri(lang, "Escolha um tema", "Choose a theme", "Elige un tema")}
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
              {theme.id === "auto" && (
                <span className="theme-preview-split">
                  <i />
                  <b>
                    <i />
                    <i />
                    <i />
                  </b>
                </span>
              )}
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
        {tri(
          lang,
          "Esta preferência é salva somente neste navegador.",
          "This preference is saved only in this browser.",
          "Esta preferencia se guarda solo en este navegador.",
        )}
      </p>
    </section>
  );
}
