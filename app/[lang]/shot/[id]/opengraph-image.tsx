import { contentKey } from "@/lib/public-id";
import type { ContentResponse, ScreenshotRecord } from "@/lib/content-types";
import { getGameBySlug } from "@/lib/igdb";
import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { cachedCardData } from "@/lib/og-data";
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

  const data = await cachedCardData(["shot", id], async (api) => {
    if (!contentKey(id)) return null;
    const shot = (
      await api.optional<ContentResponse<ScreenshotRecord>>(
        `/screenshots/${encodeURIComponent(id)}`,
      )
    )?.data;
    if (!shot || shot.deleted_at) return null;
    const game = shot.game_slug ? await getGameBySlug(shot.game_slug) : null;
    const covered = shot.contains_spoilers || shot.sensitive;
    const [gameCover, rendered] = await Promise.all([
      renderableImage(game?.coverUrl),
      covered ? Promise.resolve(null) : renderableImage(shot.image_url),
    ]);
    return {
      shot,
      gameName: game?.name ?? null,
      gameCover,
      rendered,
    };
  });

  const eyebrow = tri(lang, "CAPTURA", "SCREENSHOT", "CAPTURA");
  if (!data)
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

  const { shot, gameName, gameCover, rendered } = data;
  const owner = Array.isArray(shot.profiles) ? shot.profiles[0] : shot.profiles;

  return ogResponse({
    eyebrow,
    title: gameName || eyebrow,
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
    image: shot.sensitive ? null : (rendered ?? gameCover),
    fallbackText: gameName ?? "uloggd",
  });
}
