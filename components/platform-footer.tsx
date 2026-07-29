import Link from "next/link";
import { FaXTwitter } from "react-icons/fa6";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import packageInfo from "@/package.json";
import { CookieSettingsButton } from "./cookie-settings-button";
import { tri } from "@/lib/ui-text";

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
        <span className="platform-version">v{packageInfo.version}</span>
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
        <a
          className="platform-social-link"
          href="https://x.com/uloggd"
          target="_blank"
          rel="me noreferrer"
          aria-label="uloggd no X · @uloggd"
        >
          <FaXTwitter size={13} aria-hidden />
          @uloggd
        </a>
      </div>
      <nav
        aria-label={tri(
          lang,
          "Links do rodapé",
          "Footer links",
          "Enlaces del pie de página",
        )}
      >
        <a href="mailto:contact@uloggd.com">
          {tri(lang, "Entrar em contato", "Contact us", "Contactar")}
        </a>
        <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link>
        <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>
        <Link href={`/${lang}/legal/cookies`}>
          {tri(lang, "Cookies", "Cookies", "Cookies")}
        </Link>
        <CookieSettingsButton lang={lang} />
        <Link href={`/${lang}/legal/child-safety`}>{d.legal.safety}</Link>
      </nav>
    </footer>
  );
}
