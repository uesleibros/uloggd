import { getGameBySlug } from "@/lib/igdb";
import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { getOgSupabase } from "@/lib/supabase/og";
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

  const supabase = getOgSupabase();
  const { data: shot } = await supabase
    .from("screenshots")
    .select(
      "image_url,description,game_slug,contains_spoilers,sensitive,deleted_at,profiles!screenshots_profile_id_fkey(username,display_name)",
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

  // Two separate covers, and the sensitive one was being read and then
  // ignored: a screenshot marked as adult content unfurled at full size into
  // whatever chat the link was pasted in, which is the one place the mark
  // exists to stop. An unfurl is the least consenting surface there is, since
  // nobody chose to open it.
  const covered = shot.contains_spoilers || shot.sensitive;
  const shotUrl = covered ? null : shot.image_url;

  return ogResponse({
    eyebrow,
    title: game?.name || eyebrow,
    subtitle:
      tri(lang, "por ", "by ", "por ") +
      (owner?.display_name || `@${owner?.username ?? ""}`),
    body: shot.sensitive
      ? tri(
          lang,
          "Conteúdo sensível. Abra no uloggd para ver.",
          "Sensitive content. Open on uloggd to see it.",
          "Contenido sensible. Ábrelo en uloggd para verlo.",
        )
      : shot.contains_spoilers
        ? tri(
            lang,
            "Contém spoilers.",
            "Contains spoilers.",
            "Contiene spoilers.",
          )
        : clamp(shot.description, 140),
    // The game cover stands in for a covered screenshot, and is dropped
    // entirely when the mark is the sensitive one: a cover is a fine stand-in
    // for a spoiler and the wrong instinct for adult content, since it makes
    // the card look like an ordinary post.
    image: shot.sensitive
      ? null
      : ((await renderableImage(shotUrl)) ?? game?.coverUrl ?? null),
    fallbackText: game?.name ?? "uloggd",
  });
}
