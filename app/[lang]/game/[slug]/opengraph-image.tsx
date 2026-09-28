import { getGameBySlug } from "@/lib/igdb";
import { formatRating } from "@/lib/review-rating";
import {
  clamp,
  ogResponse,
  safeOgResponse,
  OG_CONTENT_TYPE,
  OG_SIZE,
} from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { cachedCardData } from "@/lib/og-data";
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
async function card({ params }: Props) {
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

  // The cover goes through `renderableImage` like every other card's does.
  // This one handed satori the raw URL, which works only as long as the URL is
  // absolute and the bytes are PNG or JPEG: a relative path kills the request
  // outright, and a WebP draws nothing. It also skips the fetch cache and the
  // size cap the others get for free.
  const { community, cover } = await cachedCardData(
    ["game", slug],
    async (api) => {
      const [ratings, rendered] = await Promise.all([
        api.get<{ data: { rating: number; rating_count: number }[] }>(
          `/games/ratings?ids=${game.id}`,
        ),
        renderableImage(game.coverUrl),
      ]);
      return {
        community: ratings.data[0]
          ? {
              rating: Number(ratings.data[0].rating),
              count: Number(ratings.data[0].rating_count),
            }
          : null,
        cover: rendered,
      };
    },
  );

  return ogResponse({
    eyebrow: tri(lang, "JOGO", "GAME", "JUEGO"),
    title: game.name,
    subtitle: [game.releaseYear, game.platforms?.[0]]
      .filter(Boolean)
      .join(" · "),
    body: clamp(game.summary, 150),
    image: cover,
    fallbackText: game.name,
    badge:
      community && community.count > 0
        ? formatRating(community.rating, "stars_5", lang)
        : null,
  });
}

/**
 * The card, behind a guard.
 *
 * A share card reads the catalogue, and the catalogue can be rate limited or
 * briefly unreachable. Crawlers are most of this traffic, so a throw here
 * comes back every few seconds: the plain card is the right answer, not a
 * five hundred.
 */
export default async function Image(props: Props) {
  const { lang } = await props.params;
  return safeOgResponse("game", () => card(props), {
    eyebrow: "uloggd",
    title: "uloggd",
    body: tri(
      resolveLocale(lang),
      "Diário e comunidade de jogos.",
      "A game journal and community.",
      "Diario y comunidad de juegos.",
    ),
  });
}
