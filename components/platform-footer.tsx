import Link from "next/link";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

export function PlatformFooter({
  lang,
  dictionary: d,
}: {
  lang: Locale;
  dictionary: Dictionary;
}) {
  return (
    <footer className="platform-footer">
      <div>
        <strong>© 2026 uloggd</strong>
        <span>{d.platform.gameData}</span>
      </div>
      <nav aria-label={lang === "pt-BR" ? "Links do rodapé" : "Footer links"}>
        <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link>
        <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>
        <Link href={`/${lang}/legal/cookies`}>
          {lang === "pt-BR" ? "Cookies" : "Cookies"}
        </Link>
        <Link href={`/${lang}/legal/child-safety`}>{d.legal.safety}</Link>
      </nav>
    </footer>
  );
}
