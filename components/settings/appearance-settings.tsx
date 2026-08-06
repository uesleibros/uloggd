"use client";

import { Check } from "lucide-react";
import { useSyncExternalStore } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  readCustomTheme,
  saveCustomTheme,
  saveThemePreference,
  THEME_CHANGE_EVENT,
} from "@/components/theme-manager";
import { deriveCustomTheme, customThemeStyle } from "@/lib/custom-theme";
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
  {
    id: "custom",
    label: { "pt-BR": "Sua cor", en: "Your colour", es: "Tu color" },
    description: {
      "pt-BR": "Escolha uma cor e o resto do site se ajusta a ela.",
      en: "Pick a colour and the rest of the site adjusts to it.",
      es: "Elige un color y el resto del sitio se ajusta a él.",
    },
  },
];

/**
 * Where a custom theme starts before anybody has chosen.
 *
 * The site's own accent, so the first thing somebody sees after selecting the
 * option is a theme rather than an empty state asking them to invent one.
 */
const DEFAULT_CUSTOM = "#5865f2";

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

  // Re-read on the same event the selection uses, so picking a colour and
  // switching themes cannot disagree about what is stored.
  const storedColour = useSyncExternalStore(
    (notify) => {
      window.addEventListener(THEME_CHANGE_EVENT, notify);
      return () => window.removeEventListener(THEME_CHANGE_EVENT, notify);
    },
    () => readCustomTheme()?.colour ?? DEFAULT_CUSTOM,
    () => DEFAULT_CUSTOM,
  );

  const applyColour = (colour: string) => {
    const derived = deriveCustomTheme(colour);
    if (!derived) return;
    saveCustomTheme({
      colour,
      base: derived.base,
      style: customThemeStyle(derived),
    });
  };

  const selectTheme = (preference: ThemePreference) => {
    // Choosing the custom square is choosing a colour, so it applies one
    // immediately instead of selecting an option that does nothing yet.
    if (preference === "custom") applyColour(storedColour);
    else saveThemePreference(preference);
  };

  const preview = deriveCustomTheme(storedColour);

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

      <RadioGroup
        className="theme-options"
        value={selected}
        onValueChange={(value) => selectTheme(value as ThemePreference)}
        aria-label={tri(
          lang,
          "Escolha um tema",
          "Choose a theme",
          "Elige un tema",
        )}
      >
        {themes.map((theme) => (
          <RadioGroupItem
            className="theme-option"
            data-theme-preview={theme.id}
            data-selected={selected === theme.id || undefined}
            key={theme.id}
            value={theme.id}
            style={
              theme.id === "custom" && preview
                ? ({
                    "--preview-canvas": preview.tokens["console-canvas"],
                    "--preview-panel": preview.tokens["console-panel"],
                    "--preview-raised": preview.tokens["console-hover"],
                  } as React.CSSProperties)
                : undefined
            }
          >
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
          </RadioGroupItem>
        ))}
      </RadioGroup>

      {selected === "custom" && (
        <div className="theme-custom-picker">
          {/* Outside the radio, not inside it: the option is a button, and an
              input nested in a button is invalid and fights it for the click. */}
          <label htmlFor="theme-custom-colour">
            {tri(lang, "Cor base", "Base colour", "Color base")}
          </label>
          <input
            id="theme-custom-colour"
            type="color"
            value={storedColour}
            onChange={(event) => applyColour(event.target.value)}
          />
          <code>{storedColour.toUpperCase()}</code>
          <p>
            {preview?.base === "light"
              ? tri(
                  lang,
                  "Uma cor clara, então o site usa o modo claro.",
                  "A light colour, so the site uses light mode.",
                  "Un color claro, así que el sitio usa el modo claro.",
                )
              : tri(
                  lang,
                  "Uma cor escura, então o site usa o modo escuro.",
                  "A dark colour, so the site uses dark mode.",
                  "Un color oscuro, así que el sitio usa el modo oscuro.",
                )}
          </p>
        </div>
      )}

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
