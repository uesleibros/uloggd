"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";

export function LocaleSwitcher({ locale }: { locale: "pt-BR" | "en" }) {
  const pathname = usePathname();
  const nextLocale = locale === "pt-BR" ? "en" : "pt-BR";
  const segments = pathname.split("/");
  segments[1] = nextLocale;
  const href = segments.join("/") || `/${nextLocale}`;

  return (
    <Link href={href} hrefLang={nextLocale} className="locale-switcher">
      <Globe2 size={19} />
      <span>{nextLocale === "en" ? "English" : "Português"}</span>
    </Link>
  );
}
