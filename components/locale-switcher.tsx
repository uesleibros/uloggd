"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { flagEmoji } from "@/lib/countries";
import { withEmoji } from "@/lib/emoji";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A language is shown as its flag rather than as two letters.
 *
 * `region` is the country whose flag stands for the language, not the
 * language itself: a flag is a place and a language is not, which is why it
 * is written down here instead of being derived from the locale. The letters
 * stay in the menu beside each name, because a flag on its own is a guess
 * and this is the one place with room to say which is which.
 *
 * The flags go through the same twemoji pass as the rest of the site: a
 * Windows browser draws a flag emoji as the two letters it is made of, which
 * would have made the change do nothing there.
 */
const languages = [
  { locale: "pt-BR", short: "PT", region: "BR", label: "Português" },
  { locale: "en", short: "EN", region: "US", label: "English" },
  { locale: "es", short: "ES", region: "ES", label: "Español" },
] as const;

export function LocaleSwitcher({ locale }: { locale: UiLang }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = languages.find((language) => language.locale === locale)!;

  function hrefFor(nextLocale: UiLang) {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="locale-switcher-trigger"
        aria-label={tri(
          locale,
          "Mudar idioma",
          "Change language",
          "Cambiar idioma",
        )}
      >
        <span className="locale-flag" aria-hidden>
          {withEmoji(flagEmoji(current.region))}
        </span>
        <span>{current.label}</span>
        <ChevronDown size={14} aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="locale-menu"
          align="end"
          sideOffset={8}
          collisionPadding={12}
        >
          <DropdownMenu.Label className="locale-menu-label">
            {tri(locale, "Idioma", "Language", "Idioma")}
          </DropdownMenu.Label>
          {languages.map((language) => (
            <DropdownMenu.Item
              className="locale-menu-item"
              key={language.locale}
              onSelect={() => router.push(hrefFor(language.locale))}
            >
              <span className="locale-flag" aria-hidden>
                {withEmoji(flagEmoji(language.region))}
              </span>
              <span>{language.label}</span>
              <small>{language.short}</small>
              {language.locale === locale && (
                <Check
                  size={15}
                  aria-label={tri(
                    locale,
                    "Selecionado",
                    "Selected",
                    "Seleccionado",
                  )}
                />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
