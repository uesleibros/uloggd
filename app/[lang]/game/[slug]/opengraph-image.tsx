import { getCommunityGameRatings } from "@/lib/community-ratings";
import { getGameBySlug } from "@/lib/igdb";
import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { getOgSupabase } from "@/lib/supabase/og";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "Jogo no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; slug: string }> };

/**
 * The card for a game page.
 *
 * Carries the community rating rather than the catalogue's own, because the
 * catalogue is the same everywhere and what people came here for is what this
 * community thought. A game nobody has rated shows the year instead of a
 * number, since an empty average reads as a bad one.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang = resolveLocale(rawLang);
  const game = await getGameBySlug(slug);

  if (!game)
    return ogResponse({
      eyebrow: tri(lang, "JOGO", "GAME", "JUEGO"),
      title: "uloggd",
      body: tri(
        lang,
        "Diário e comunidade de jogos.",
        "A game journal and community.",
        "Diario y comunidad de juegos.",
      ),
    });

  const ratings = await getCommunityGameRatings(getOgSupabase(), [game.id]);
  const community = ratings.get(game.id) ?? null;

  return ogResponse({
    eyebrow: tri(lang, "JOGO", "GAME", "JUEGO"),
    title: game.name,
    subtitle: [game.releaseYear, game.platforms?.[0]]
      .filter(Boolean)
      .join(" · "),
    body: clamp(game.summary, 150),
    image: game.coverUrl,
    badge:
      community && community.count > 0
        ? `${(community.rating / 20).toFixed(1)}/5`
        : null,
  });
}
