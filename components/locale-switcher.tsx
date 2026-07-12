"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const languages = [
  { locale: "pt-BR", short: "PT", label: "Português" },
  { locale: "en", short: "EN", label: "English" },
] as const;

export function LocaleSwitcher({ locale }: { locale: "pt-BR" | "en" }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = languages.find((language) => language.locale === locale)!;

  function hrefFor(nextLocale: "pt-BR" | "en") {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="locale-switcher-trigger"
        aria-label={locale === "pt-BR" ? "Mudar idioma" : "Change language"}
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
            {locale === "pt-BR" ? "Idioma" : "Language"}
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
                  aria-label={locale === "pt-BR" ? "Selecionado" : "Selected"}
                />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
