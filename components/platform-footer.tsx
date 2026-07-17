import Link from "next/link";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { CookieSettingsButton } from "./cookie-settings-button";

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
        <span>
          {d.platform.gameData}{" "}
          <a
            className="platform-data-link"
            href="https://www.igdb.com/"
            target="_blank"
            rel="noreferrer"
          >
            IGDB
          </a>
        </span>
      </div>
      <nav aria-label={lang === "pt-BR" ? "Links do rodapé" : "Footer links"}>
        <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link>
        <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>
        <Link href={`/${lang}/legal/cookies`}>
          {lang === "pt-BR" ? "Cookies" : "Cookies"}
        </Link>
        <CookieSettingsButton lang={lang} />
        <Link href={`/${lang}/legal/child-safety`}>{d.legal.safety}</Link>
      </nav>
    </footer>
  );
}
