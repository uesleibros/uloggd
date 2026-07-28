"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { tri, type UiLang } from "@/lib/ui-text";

const languages = [
  { locale: "pt-BR", short: "PT", label: "Português" },
  { locale: "en", short: "EN", label: "English" },
  { locale: "es", short: "ES", label: "Español" },
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
        <Globe2 size={17} />
        <span>{current.label}</span>
        <small>{current.short}</small>
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
