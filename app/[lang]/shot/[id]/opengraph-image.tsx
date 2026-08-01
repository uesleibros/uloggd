import { getGameBySlug } from "@/lib/igdb";
import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { getSupabase } from "@/lib/supabase/auth";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "Captura no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; id: string }> };

/**
 * The card for a screenshot link.
 *
 * A screenshot marked as containing spoilers falls back to the game's cover.
 * Everywhere else in the app that image sits behind a deliberate tap, and an
 * unfurl is the one place someone sees it without choosing to.
 *
 * A deleted screenshot draws the generic card, since the row survives deletion
 * for moderation and its image must not.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, id } = await params;
  const lang = resolveLocale(rawLang);

  const supabase = await getSupabase();
  const { data: shot } = await supabase
    .from("screenshots")
    .select(
      "storage_path,image_url,description,game_slug,contains_spoilers,deleted_at,profiles!screenshots_profile_id_fkey(username,display_name)",
    )
    .eq("public_id", id)
    .maybeSingle();

  const eyebrow = tri(lang, "CAPTURA", "SCREENSHOT", "CAPTURA");
  if (!shot || shot.deleted_at)
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

  const owner = Array.isArray(shot.profiles) ? shot.profiles[0] : shot.profiles;
  const game = shot.game_slug ? await getGameBySlug(shot.game_slug) : null;

  // Screenshots live in a private bucket, so the image has to be signed. The
  // URL never leaves this process: it is fetched here and the pixels are baked
  // into the card, so a short life is enough and nothing signed is published.
  let shotUrl: string | null = null;
  if (!shot.contains_spoilers) {
    shotUrl = shot.image_url;
    // Rows written before the move to imgchest still live in the bucket. The
    // signed URL never leaves this process: it is fetched here and the pixels
    // are baked into the card.
    if (!shotUrl && shot.storage_path) {
      const { data: signed } = await supabase.storage
        .from("screenshots")
        .createSignedUrl(shot.storage_path, 60);
      shotUrl = signed?.signedUrl ?? null;
    }
  }

  return ogResponse({
    eyebrow,
    title: game?.name || eyebrow,
    subtitle:
      tri(lang, "por ", "by ", "por ") +
      (owner?.display_name || `@${owner?.username ?? ""}`),
    body: shot.contains_spoilers
      ? tri(
          lang,
          "Contém spoilers.",
          "Contains spoilers.",
          "Contiene spoilers.",
        )
      : clamp(shot.description, 140),
    image: (await renderableImage(shotUrl)) ?? game?.coverUrl ?? null,
    fallbackText: game?.name ?? "uloggd",
  });
}
