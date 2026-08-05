import { ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { resolveLocale } from "./dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string }> };

/**
 * The card every page without one of its own falls back to.
 *
 * Metadata files are inherited by nested segments, so this single card covers
 * the home page, search, the workspace indexes, the legal pages and the sign
 * in screen at once. Those were unfurling with the raw logo file, which is a
 * square picture of a mark with no words on it: a link to the site looked like
 * a link to an image.
 *
 * Anything with something specific to say still says it. A profile, a game, a
 * review and the rest each define their own and override this.
 *
 * Reads nothing, so it renders from the parameters alone and caches as well as
 * anything on the site can.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang } = await params;
  const lang = resolveLocale(rawLang);
  return ogResponse({
    eyebrow: tri(lang, "DIÁRIO DE JOGOS", "GAME JOURNAL", "DIARIO DE JUEGOS"),
    title: "uloggd",
    body: tri(
      lang,
      "Registre o que você joga, escreva sobre isso e acompanhe quem joga com você.",
      "Log what you play, write about it, and follow the people who play alongside you.",
      "Registra lo que juegas, escribe sobre ello y sigue a quienes juegan contigo.",
    ),
  });
}
