import { getGameBySlug } from "@/lib/igdb";
import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { getOgSupabase } from "@/lib/supabase/og";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";
import { contentKey } from "@/lib/public-id";

export const alt = "Avaliação no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; id: string }> };

/**
 * The card for a review link.
 *
 * Reads through the ordinary client, so row-level security decides what this
 * can see exactly as it does for the page: a review whose visibility hides it
 * from a signed-out visitor resolves to nothing here too, and the generic card
 * is drawn rather than its contents.
 *
 * A spoiler review shows its rating and never its text. The whole point of the
 * flag is that the words are not safe to read yet, and an unfurl in a group
 * chat is the last place someone consents to reading them.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, id } = await params;
  const lang = resolveLocale(rawLang);
  const key = contentKey(id);

  const { data: review } = key
    ? await getOgSupabase()
        .from("reviews")
        .select(
          "title,content,contains_spoilers,rating,rating_mode,game_slug,profiles!reviews_profile_id_fkey(username,display_name)",
        )
        .eq(key[0], key[1])
        .maybeSingle()
    : { data: null };

  const eyebrow = tri(lang, "AVALIAÇÃO", "REVIEW", "RESEÑA");
  if (!review)
    return ogResponse({
      eyebrow,
      title: "uloggd",
      body: tri(
        lang,
        "Diário e comunidade de jogos.",
        "A game journal and community.",
        "Diario y comunidad de juegos.",
      ),
    });

  const owner = Array.isArray(review.profiles)
    ? review.profiles[0]
    : review.profiles;
  const game = review.game_slug ? await getGameBySlug(review.game_slug) : null;
  const author = owner?.display_name || `@${owner?.username ?? ""}`;

  return ogResponse({
    eyebrow,
    title: game?.name || review.title || eyebrow,
    subtitle: tri(lang, "por ", "by ", "por ") + author,
    body: review.contains_spoilers
      ? tri(
          lang,
          "Contém spoilers.",
          "Contains spoilers.",
          "Contiene spoilers.",
        )
      : clamp(review.content, 150),
    image: await renderableImage(game?.coverUrl),
    fallbackText: game?.name ?? review.title ?? "uloggd",
    badge:
      typeof review.rating === "number"
        ? formatRating(review.rating, review.rating_mode)
        : eyebrow,
  });
}

/**
 * Ratings are stored on a 0-100 scale and displayed in whichever scale the
 * author chose. A badge has room for the number and nothing else, so this
 * mirrors the page's formatting without its locale-aware decimals.
 */
function formatRating(rating: number, mode: string | null) {
  if (mode === "score_100") return `${rating}/100`;
  if (mode === "score_10") return `${(rating / 10).toFixed(1)}/10`;
  if (mode === "level_5") return `${Math.round(rating / 20)}/5`;
  return `${(rating / 20).toFixed(1)}/5`;
}
