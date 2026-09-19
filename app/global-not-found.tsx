import "./globals.css";
import type { Metadata } from "next";
import { NotFoundView } from "@/components/not-found-view";
import { fontVariables } from "@/lib/fonts";
import { themeBootstrapScript } from "@/lib/theme";

/**
 * The 404 for a URL that matches no route at all.
 *
 * The site's layout lives under `[lang]`, so there is no layout above it to
 * draw a 404 in. The proxy covers the common case by rewriting an unknown first
 * segment to `/[lang]/not-found`, but it only checks the first segment: a dead
 * address under a real one, `/pt-BR/game/zelda/typo` or `/pt-BR/u/name/nothing`,
 * matched no page and got Next's own fallback, unstyled black text on white in
 * the middle of an otherwise dark site. This is the convention Next provides
 * for exactly this layout shape, and it has to bring its own document, styles,
 * fonts and theme because nothing above it will.
 */
export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="pt-BR" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          id="uloggd-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>
        <NotFoundView />
      </body>
    </html>
  );
}
