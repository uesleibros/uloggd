import { getGamesByIds } from "@/lib/igdb";
import { clamp, ogResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-card";
import { renderableImage } from "@/lib/og-image-source";
import { contentKey } from "@/lib/public-id";
import { cachedCardData, getOgSupabase } from "@/lib/supabase/og";
import { resolveLocale } from "../../dictionaries";
import { tri } from "@/lib/ui-text";

export const alt = "Sessão no uloggd";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = { params: Promise<{ lang: string; id: string }> };

/**
 * The card for a diary entry link.
 *
 * The note is held back when the entry is marked as containing spoilers. An
 * unfurl is the one place somebody reads it without choosing to, which is the
 * whole point of the mark.
 *
 * A private entry gets the generic card rather than a broken one: the query
 * runs as an anonymous reader, so row level security simply returns nothing,
 * and that is the correct answer for a picture posted in a group chat.
 */
export default async function Image({ params }: Props) {
  const { lang: rawLang, id } = await params;
  const lang = resolveLocale(rawLang);
  const eyebrow = tri(lang, "SESSÃO", "SESSION", "SESIÓN");
  const key = contentKey(id);
  if (!key) return ogResponse({ eyebrow, title: "uloggd" });

  const data = await cachedCardData(["entry", key[0], key[1]], async () => {
    const { data: entry } = await getOgSupabase()
      .from("diary_entries")
      .select(
        "igdb_id,game_slug,note,contains_spoilers,minutes,played_on,profiles!diary_entries_profile_id_fkey(username,display_name)",
      )
      .eq(key[0], key[1])
      .maybeSingle();
    if (!entry) return null;
    const game = (await getGamesByIds([entry.igdb_id]))[0];
    return {
      entry,
      gameName: game?.name ?? null,
      cover: await renderableImage(game?.coverUrl),
    };
  });

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

  const { entry, gameName, cover } = data;
  const author = Array.isArray(entry.profiles)
    ? entry.profiles[0]
    : entry.profiles;
  const hours = Math.floor((entry.minutes ?? 0) / 60);
  const minutes = (entry.minutes ?? 0) % 60;

  return ogResponse({
    eyebrow,
    title: gameName ?? entry.game_slug,
    subtitle: author?.display_name
      ? `${author.display_name} · @${author.username}`
      : `@${author?.username ?? ""}`,
    body: entry.contains_spoilers
      ? tri(
          lang,
          "Esta sessão contém spoilers.",
          "This session contains spoilers.",
          "Esta sesión contiene spoilers.",
        )
      : clamp(entry.note, 130),
    image: cover,
    imageShape: "rounded",
    fallbackText: gameName ?? entry.game_slug,
    stats: entry.minutes
      ? [
          {
            value: hours ? `${hours}h ${minutes}min` : `${minutes}min`,
            label: tri(lang, "JOGADO", "PLAYED", "JUGADO"),
          },
        ]
      : [],
  });
}
